/*
---
description: Color Picker. Support for HSB / HSL / HSG.  Support For MSPaint, Adobe, GIMP, and Wheel Style pickers.

license: OSL [Open Source License from the Open Source Initiative].

authors:
- Sam Goody
- eliyahug

requires:
- Core/*
- More/Utilites: Color

provides: [ColorRoller]

...
*/
var CRImages = "../Source/Assets/";

var ColorRoller = new Class({

	Implements: [Options,Events],
	
	options: {
        onComplete: $empty, 
        onCancel: $empty,
		onChange: $empty,
		space: 'G',
		color: [127,127,127],
		type: 0,
		colorswitch: 'rgb'
	},

	initialize: function(element,options){
		this.setOptions(options);
		this.build();
		
		var els = this.els, 
			color = this.options.color;
		this.barHeight = els.crBar.getSize().y;
		this.boxHeight = els.crBox.getSize().y;
		this.radius = els.crBox.getSize().x / 2;
		
		this.vLast = +(this.options.type < 2);
		this.setRGB($type(color) == 'String' ? color.hexToRgb(1) : color, 3);
		els.crShow.setStyle('background-color', color.rgbToHex());
		els.crShow.set('src', CRImages + 'crShow.png').injectAfter($(element));
		els.crColorRoller.addClass('crHide');
		this.addEvents();
	},
	
	build: function(){
		var self = this, i=0, els = this.els = {};

		$each(
			{Space:'select',Type:'select',Img:'img',Show:'img',View:'span',Circle:'div',Triangle:'div',Tri1:'div',Tri2:'div',Shade:'div'},
			function(v,k){ els['cr'+k] = new Element(v,{'class':'cr'+k}) }
		);
		$each({0:'Color Wheel', 1:'MS Paint',2:'Adobe CS',3:'GIMP',G:'HSG', B:'HSB/V',L:'HSL/I'},
			function(v,k){
				new Element('option',{'value':k,'text':v,'class':'crO'+k}).inject(++i>4 ? els.crSpace : els.crType);
			});
		['ColorRoller','Head','Box','BoxSel','BoxSee','Bar','BarSel','Nums','Val','Complete','Cancel','Isoceles','Right'].each(
			function(v){
				els['cr'+v] = new Element('div',{'class':'cr'+v});
			});
		$each({R:'inputRGB',G:'inputRGB',B:'inputRGB',0:'input0',S:'inputS',1:'input1',Hex:'inputRGBHex'},
			function(v,k){
				if (k == 0) k = 0; // Yes, I know this is odd.
				els['cr' +k] = new Element('span',{'text':k||'H','class':'cr'+k||'H'});
				els['crI'+k] = new Element('input',{'type':'text','class':'crI'+k});
				els['crI'+k].addEvent('keyup',self[v].bind(self));
			});
		
		if (Browser.Engine.trident && Browser.Engine.version < 5)
				els.crImg = new Element('span').adopt(els.crImgIE = new Element('img',{'class':'crImg'}));
		
		with(els){		// The evil 'with'. Ran tests, found it efficient and readable.
			crColorRoller.adopt(
				crHead.adopt(
					crComplete.set('html', 	'&#8730;'),//'&#9745;'+'&#10003;'+'&#x2713;'+ '<span style="font-family: verdana; letter-spacing: -8px; font-weight: bold;">v/</span>'), //,
					crCancel.set('html','X')//'&#8855;','&#x2717;'
				),
				crBox.adopt(
					crImg,
					crBoxSel.adopt(crBoxSee),
					crCircle,
					crTriangle.adopt(crTri1, crTri2).setStyle('display','none'),
					crShade
				),
				crBar.adopt(crBarSel),
				crNums.adopt(
					crSpace,crType,crVal.adopt(
						crR,crIR,crG,crIG,crB,crIB,cr0,crI0,crS,crIS,cr1,crI1
					),
					crHex,crIHex,crView
				)
			).inject(document.body);	
		}
		
		if (Browser.Engine.trident) {
			var H = els.crBox.clientHeight;
			for (var i=1; i<13; i++){
				var rad = 7 * i * Math.PI * 2 / 360,
				cos = Math.cos(rad),
				sin = Math.sin(rad),
				filter = 'progid:DXImageTransform.Microsoft.Matrix(sizingMethod="auto expand", M11 = '
					+ cos + ', M12 = '+ (-sin) + ', M21 = ' + sin + ', M22 = ' + cos +')',
				obj = new Element('div', { styles:{
					filter: filter,
					'-ms-filter': filter
				}}).inject(els.crCircle);
				obj.setStyles({
					top: (H - obj.offsetHeight) / 2,
					left: (H - obj.offsetWidth) / 2
				});
			}
		}
	},
	
	addEvents: function(){
		var self = this, els = this.els;
		els.crSpace.addEvent('change',this.setSpace.bind(this)).fireEvent('change');
		els.crType.addEvent('change',this.setType.bind(this)).fireEvent('change');
		els.crShow.addEvent('click',this.show.bind(this));
		els.crComplete.addEvent('click',this.close.pass(1,self));
		els.crCancel.addEvent('click',this.close.pass(0,self));
		function mousedown(e){ self.mousedown = true; e.stop() }
		els.crColorRoller.addEvent('mouseup',function(){ self.mousedown = false });
		els.crBarSel.addEvents('mousedown',mousedown);
		els.crBar.addEvents({
			'mousemove':self.slider.bind(self),
			'mousedown':function(e){
				mousedown(e);
				self.slider(e);
			}
		});
		els.crShade.addEvents({
			'mousemove':self.picker.bind(self),
			'mousedown':function(e){
				mousedown(e);
				self.picker(e);
			}
		});
	},
	
	//Inputs:
	inputRGB: function(){
		this.setRGB(this.getValues(['R','G','B']),1);
	},
	inputRGBHex: function(event){
		this.setRGB(event.target.value.hexToRgb(1),2);
	},
	input0: function(event){
		this.inputHSV(0,event.target.value);
	},
	inputS: function(event){
		this.setPicker( this.els['crI'+ +(!this.vLast)].get('value'), event.target.value, 1)
	},
	input1: function(event){
		this.inputHSV(1,event.target.value);
	},
	inputHSV: function(el,val){
		this.vLast != el 
			? this.setPicker(val,this.getValues(['S']),1)
			: this.setSlider(val,1);
	},
	slider: function(event){
		var max = this.vLast ? 100 : 360, 
			val = max - max * (event.page.y - this.offset.y) / this.barHeight;
		if (this.mousedown && val > -1 && val < max) this.setSlider(val, 2);
	},
	picker: function(event){
		if (!this.mousedown) return;
		var els = this.els, val, S,
			X = event.page.x - this.offset.x,
			Y = event.page.y - this.offset.y;
		
		if (!this.type){
			var O = X - this.radius,
				A = this.radius - Y;
			val = Math.atan2(O,A) * 180 / Math.PI;
			S = Math.sqrt(O*O+A*A) * 100 / this.radius;
			if (val < 0) val -= -360;
		} else if (this.type < 3) {
			val = (this.vLast ? 360 : 100) * X / this.boxHeight;
			S = 100 - 100 * Y / this.boxHeight;
		} else {


		var boxWidth = this.boxHeight,
			m = this.boxHeight / (boxWidth / 2), //= 2,
			b = Y - (m * X);
						
			
		
		switch (this.space){
/*
	Given Variables: 
		X - the x coordinate that is clicked.
		Y - the y coordinate that is clicked.
		this.boxHeight - the height (and width) of the box containing the triangle.
		0,0 is the upper left corner of the box.
		
	In all, we need S and val.
	val can be described as the percentage at which the line crosses the bottom (where 0 is the left). 
	S can be described as the percentage at which the click was of the line , where 0 is the bottom.
	The lines can be seen at the link I sent you.
*/
				case 'G':
					var m2 = Y / (X - boxWidth/2) ,
					b2 = Y - m2 * X,
					x9 = (this.boxHeight - b2)/m2;
										
					val = x9 / boxWidth; //((Y - this.boxHeight) / 2 + X) / Y;
					S =  1 - Y / this.boxHeight;//(x9-X)/ (x9-boxwidth/2) //yours is more elegant.
					break;
				case 'L':
					var x8 = (X < (boxWidth/2) ? boxWidth-X : X),
					b3 = Y- (m * x8)
					x7 = (this.boxHeight-b3)/ m ;
					
					S =  (x8-x7)/ (x8-boxWidth);//	; ((this.boxHeight - Y) / (2 * (X > this.boxHeight / 2 ? this.boxHeight - X : X)))
					val = X / boxWidth  ; // X/this.boxHeight;
					break;
				case 'B':
					var	x4 = (this.boxHeight - b) / m;
						
					S = (x4 - X) / (x4/2);
					val = (x4) / (boxWidth);
						
			}
			val *= 100;
			S *= 100;
			
			
			
			
			
			
			
			if (val > 100 || val < 0) return;
		}
		if (S > 100) return;
		els.crBoxSel.setPosition({
			y:Y, 
			x:X 
		});
		this.setPicker(val, S, 2);
	},
	
	// Set Values
	setRGB: function(val,step){
		//steps - 0:HSV, 1:inputs, 2:Hex, 3:View. 
		var e = this.els, hex = val.rgbToHex().toUpperCase();
		this.fireEvent('change',hex);
		if (step != 1) this.setValues(['R','G','B'], val);
		if (step != 2) e.crIHex.set('value', hex);
		e.crView.setStyle('background-color', 'rgb(' + val + ')');
		if (step){
			var hsv = val.fromRgb(this.space);
			if (!this.vLast) hsv.reverse();
			this.setPicker(hsv[0],hsv[1]);
			this.setSlider(hsv[2]);
		}
	},
	setPicker: function(val,S,step){
		//steps - 0:RGB, 1:inputs, 2:Picker Position.
		if (step != 1) this.setValues([+(!this.vLast),'S'],[val,S],5);
		if (step != 2){
			console.log('here', this.type);
			if (!this.type)
				var top  = this.boxHeight - S * this.boxHeight / 100,
					left = val * this.boxHeight / (this.vLast ? 360 : 100);
			else if (this.type < 3)
				var angle = val * Math.PI / 180,
					radius = S * this.radius / 100,
					top  = this.radius - radius * Math.cos(angle),
					left = this.radius + radius * Math.sin(angle);
			else {
					
			console.log ('test 3');
			
		S /= 100;
		val /=100;
	// X=left   
	// Y= top
		var boxWidth = this.boxHeight,
			m = this.boxHeight / (boxWidth / 2) ; //= 2,
			
		switch (this.space){
			case 'L' :
				left = val * boxWidth;
				
				var x8 = (val < .5 ? boxWidth - left : left);
				var b3 = (- m * (boxWidth/2)) ,
				y8 = m * x8 + b3;
				
				top  = this.boxHeight - (this.boxHeight -y8) * S //x7 = x8 + (boxWidth- x8) * S  //b3 = -m * (boxWidth/2),
				
				
			break;
			
			case 'B':
				var x4 = boxWidth * val,
				
				
				left = x4 -.5 * x4 * S; //left = X
				var b2= this.boxHeight - m * x4
				
				top = m * left+ b2 ; //top = Y
				
			break;
			
			case 'G':
			var x4 = boxWidth * val,
			left = x4- (x4-boxWidth*.5)* S;
			top = this.boxHeight- this.boxHeight *S;//top = Y
			break;
			}
			
			
			
			
			
			}
				// triangle under developement;
			this.els.crBoxSel.setStyles({top:top, left:left});
		}
		
		if (step){ 
		S *=100;
		val *=100;
			var hsv = this.vLast
				? [val, S, this.val]
				: [this.val, S, val];
			this.setRGB(hsv.toRgb(this.space));
		}
	},
	setSlider: function(val,step){
		var els = this.els;
		
		// Set Opacity if slider is greyscale. 
		if (this.vLast){
			var v = Math.round(val * 2.55), 
			bg = [v,v,v],
			value = this.space == 'B' ? val / 100 : 
				this.space == 'L' ? 1 - Math.abs(val / 50 - 1) : 1;
			els.crImg.setStyle('opacity',value);
		} else var bg = [val,100,100].toRgb(); 
		
		//Set this.val, Slider, BG Color, steps - 0:RGB, 1:inputs.
		this.val = val;
		els.crBarSel.setStyle('top', 100 - val / (this.vLast || 3.6) + '%'); //100 - (this.vLast ? val : val / 3.6) + '%'
		els.crBox.setStyle('background-color', 'rgb(' + bg + ')');
		if (step != 1) els['crI'+this.vLast].set('value', Math.round(val));
		if (step) this.setRGB(this.getValues([0,'S',1]).toRgb(this.space)); 
	}, 
	
	// Utilities
	getValues:function(val){
		var self = this;		
		return val.map(function(el){ return self.els['crI'+el].get('value') });
	},
	setValues: function(key,val){
		var self = this;
		val.each(function(v,i){ self.els['crI'+key[i]].set('value',Math.round(v)) });
	},
	setSpace: function(e){
		var els = this.els;
		this.space = e ? e.target.value : this.options.space;
		this.els.cr1.set('text',this.space);
		this.options.colorswitch == 'rgb' 
			? this.inputRGB()
			: (this.setSlider(this.getValues(['V'])[0]) && this.inputHS());
		if (this.type == 2) this.setImg();
	},
	setType: function(e){
		var els = this.els,
			type = this.type = e ? +(e.target.value) : this.options.type,
			img = ['wheel','paint',false,'gimp'];
		this.vLast = +(type < 2);
		els.crBar.setStyle('background-image', 'url('+ CRImages + (this.vLast ? 'greyscale' : 'rainbow') + '.png)');
		els.crBox[type ? 'removeClass' : 'addClass']('crRound');
		els.crBox.setStyle('background-color','');
		this.setImg(img[type]);
		if (this.type == 2) els.crImg.setStyle('opacity',1);
		this.inputRGB();
	},
	setImg: function(img){
		img = CRImages + (img || 'adobehs' + this.space) + '.png';
		Browser.Engine.trident && Browser.Engine.version < 5 
			? this.els.crImgIE.setStyle('width',80).set('src', CRImages + 'clear.gif').setStyle('filter','progid:DXImageTransform.Microsoft.AlphaImageLoader(src='+ img +',sizingMethod="scale")')
			: this.els.crImg.set('src', img);//(this.type ? 'clear' : 'crop')
		if (Browser.Engine.trident) this.els.crCircle.setStyle('display', this.type ? 'none' : 'block'); 
		this.els.crTriangle.setStyle('display', this.type == 3 ? 'block' : 'none'); 
	},
	
	//Events
	show: function(){
		this.els.crColorRoller.removeClass('crHide');
		this.offset = {
			y: this.els.crBox.getPosition().y,
			x: this.els.crBox.getPosition().x
		};
	},
	close: function(action){
		var hex = this.getValues(['R','G','B']).rgbToHex().toUpperCase();
		this.els.crColorRoller.addClass('crHide');
		if (action) this.els.crShow.setStyle('background-color',hex);
		this.fireEvent(action ? 'complete' : 'cancel',hex); 
	}

});

