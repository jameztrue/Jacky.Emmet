/**
 * Abstract implementation of edit tree interface.
 * Edit tree is a named container of editable “name-value” child elements, 
 * parsed from <code>source</code>. This container provides convenient methods
 * for editing/adding/removing child elements. All these update actions are
 * instantly reflected in the <code>source</code> code with respect of formatting.
 * <br><br>
 * For example, developer can create an edit tree from CSS rule and add or 
 * remove properties from it–all changes will be immediately reflected in the 
 * original source.
 * <br><br>
 * All classes defined in this module should be extended the same way as in
 * Backbone framework: using <code>extend</code> method to create new class and 
 * <code>initialize</code> method to define custom class constructor.
 * 
 * @example
 * <pre><code>
 * var MyClass = require('editTree').EditElement.extend({
 *     initialize: function() {
 *     // constructor code here
 *   }
 * });
 * 
 * var elem = new MyClass(); 
 * </code></pre>
 * 
 * 
 * @param {Function} require
 * @param {Underscore} _
 * @constructor
 * @memberOf __editTreeDefine
 */
emmet.define('editTree', function(require, _, core) {
	var range = require('range').create;
	
	/**
	 * Named container of edited source
	 * @type EditContainer
	 * @param {String} source
	 * @param {Object} options
	 */
	function EditContainer(source, options) {
		this.options = _.extend({offset: 0}, options);
		/**
		 * Source code of edited structure. All changes in the structure are 
		 * immediately reflected into this property
		 */
		this.source = source;
		
		/** 
		 * List of all editable children
		 * @private 
		 */
		this._children = [];
		
		/**
		 * Hash of all positions of container
		 * @private
		 */
		this._positions = {
			name: 0
		};
		
		this.initialize.apply(this, arguments);
	}
	
	/**
	 * The self-propagating extend function for classes.
	 * @type Function
	 */
	EditContainer.extend = core.extend;
	
	EditContainer.prototype = {
		/**
		 * Child class constructor
		 */
		initialize: function() {},
		
		/**
		 * Replace substring of tag's source
		 * @param {String} value
		 * @param {Number} start
		 * @param {Number} end
		 * @private
		 */
		_updateSource: function(value, start, end) {
			// create modification range
			var r = range(start, _.isUndefined(end) ? 0 : end - start);
			var delta = value.length - r.length();
			
			var update = function(obj) {
				_.each(obj, function(v, k) {
					if (v >= r.end)
						obj[k] += delta;
				});
			};
			
			// update affected positions of current container
			update(this._positions);
			
			// update affected positions of children
			_.each(this.list(), function(item) {
				update(item._positions);
			});
			
			this.source = require('utils').replaceSubstring(this.source, value, r);
		},
			
			
		/**
		 * Adds new attribute 
		 * @param {String} name Property name
		 * @param {String} value Property value
		 * @param {Number} pos Position at which to insert new property. By 
		 * default the property is inserted at the end of rule 
		 * @returns {EditElement} Newly created element
		 */
		add: function(name, value, pos) {
			// this is abstract implementation
			var item = new EditElement(name, value);
			this._children.push(item);
			return item;
		},
		
		/**
		 * Returns attribute object
		 * @param {String} name Attribute name or its index
		 * @returns {EditElement}
		 */
		get: function(name) {
			if (_.isNumber(name))
				return this.list()[name];
			
			if (_.isString(name))
				return _.find(this.list(), function(prop) {
					return prop.name() === name;
				});
			
			return name;
		},
		
		/**
		 * Returns all children by name or indexes
		 * @param {Object} name Element name(s) or indexes (<code>String</code>,
		 * <code>Array</code>, <code>Number</code>)
		 * @returns {Array}
		 */
		getAll: function(name) {
			if (!_.isArray(name))
				name = [name];
			
			// split names and indexes
			var names = [], indexes = [];
			_.each(name, function(item) {
				if (_.isString(item))
					names.push(item);
				else if (_.isNumber(item))
					indexes.push(item);
			});
			
			return _.filter(this.list(), function(attribute, i) {
				return _.include(indexes, i) || _.include(names, attribute.name());
			});
		},
		
		/**
		 * Returns or updates element value. If such element doesn't exists,
		 * it will be created automatically and added at the end of child list.
		 * @param {String} name Element name or its index
		 * @param {String} value New element value
		 * @returns {String}
		 */
		value: function(name, value, pos) {
			var element = this.get(name);
			if (element)
				return element.value(value);
			
			if (!_.isUndefined(value)) {
				// no such element — create it
				return this.add(name, value, pos);
			}
		},
		
		/**
		 * Returns all values of child elements found by <code>getAll()</code>
		 * method
		 * @param {Object} name Element name(s) or indexes (<code>String</code>,
		 * <code>Array</code>, <code>Number</code>)
		 * @returns {Array}
		 */
		values: function(name) {
			return _.map(this.getAll(name), function(element) {
				return element.value();
			});
		},
		
		/**
		 * Remove child element
		 * @param {String} name Property name or its index
		 */
		remove: function(name) {
			var element = this.get(name);
			if (element) {
				this._updateSource('', element.fullRange());
				this._children = _.without(this._children, element);
			}
		},
		
		/**
		 * Returns list of all editable child elements
		 * @returns {Array}
		 */
		list: function() {
			return this._children;
		},
		
		/**
		 * Returns index of editble child in list
		 * @param {Object} item
		 * @returns {Number}
		 */
		indexOf: function(item) {
			return _.indexOf(this.list(), this.get(item));
		},
		
		/**
		 * Sets or gets container name
		 * @param {String} val New name. If not passed, current 
		 * name is returned
		 * @return {String}
		 */
		name: function(val) {
			if (!_.isUndefined(val) && this._name !== (val = String(val))) {
				this._updateSource(val, this._positions.name, this._positions.name + this._name.length);
				this._name = val;
			}
			
			return this._name;
		},
		
		/**
		 * Returns name range object
		 * @param {Boolean} isAbsolute Return absolute range (with respect of 
		 * rule offset)
		 * @returns {Range}
		 */
		nameRange: function(isAbsolute) {
			return range(this._positions.name + (isAbsolute ? this.options.offset : 0), this.name());
		},
		
		/**
		 * Returns range of current source
		 * @param {Boolean} isAbsolute
		 */
		range: function(isAbsolute) {
			return range(isAbsolute ? this.options.offset : 0, this.valueOf());
		},
		
		/**
		 * Returns element that belongs to specified position
		 * @param {Number} pos
		 * @param {Boolean} isAbsolute
		 * @returns {EditElement}
		 */
		itemFromPosition: function(pos, isAbsolute) {
			return _.find(this.list(), function(elem) {
				return elem.range(isAbsolute).inside(pos);
			});
		},
		
		/**
		 * Returns source code of current container 
		 * @returns {String}
		 */
		toString: function() {
			return this.valueOf();
		},

		valueOf: function() {
			return this.source;
		}
	};
	
	/**
	 * @param {EditContainer} parent
	 * @param {Object} nameToken
	 * @param {Object} valueToken
	 */
	function EditElement(parent, nameToken, valueToken) {
		/** @type EditContainer */
		this.parent = parent;
		
		this._name = nameToken.value;
		this._value = valueToken ? valueToken.value : '';
		
		this._positions = {
			name: nameToken.start,
			value: valueToken ? valueToken.start : -1
		};
		
		this.initialize.apply(this, arguments);
	}
	
	/**
	 * The self-propagating extend function for classes.
	 * @type Function
	 */
	EditElement.extend = core.extend;
	
	EditElement.prototype = {
		/**
		 * Child class constructor
		 */
		initialize: function() {},
		
		/**
		 * Make position absolute
		 * @private
		 * @param {Number} num
		 * @param {Boolean} isAbsolute
		 * @returns {Boolean}
		 */
		_pos: function(num, isAbsolute) {
			return num + (isAbsolute ? this.parent.options.offset : 0);
		},
			
		/**
		 * Sets of gets element value
		 * @param {String} val New element value. If not passed, current 
		 * value is returned
		 * @returns {String}
		 */
		value: function(val) {
			if (!_.isUndefined(val) && this._value !== (val = String(val))) {
				this.parent._updateSource(val, this.valueRange());
				this._value = val;
			}
			
			return this._value;
		},
		
		/**
		 * Sets of gets element name
		 * @param {String} val New element name. If not passed, current 
		 * name is returned
		 * @returns {String}
		 */
		name: function(val) {
			if (!_.isUndefined(val) && this._name !== (val = String(val))) {
				this.parent._updateSource(val, this.nameRange());
				this._name = val;
			}
			
			return this._name;
		},
		
		/**
		 * Returns position of element name token
		 * @param {Boolean} isAbsolute Return absolute position
		 * @returns {Number}
		 */
		namePosition: function(isAbsolute) {
			return this._pos(this._positions.name, isAbsolute);
		},
		
		/**
		 * Returns position of element value token
		 * @param {Boolean} isAbsolute Return absolute position
		 * @returns {Number}
		 */
		valuePosition: function(isAbsolute) {
			return this._pos(this._positions.value, isAbsolute);
		},
		
		/**
		 * Returns element name
		 * @param {Boolean} isAbsolute Return absolute range 
		 * @returns {Range}
		 */
		range: function(isAbsolute) {
			return range(this.namePosition(isAbsolute), this.valueOf());
		},
		
		/**
		 * Returns full element range, including possible indentation
		 * @param {Boolean} isAbsolute Return absolute range
		 * @returns {Range}
		 */
		fullRange: function(isAbsolute) {
			return this.range(isAbsolute);
		},
		
		/**
		 * Returns element name range
		 * @param {Boolean} isAbsolute Return absolute range
		 * @returns {Range}
		 */
		nameRange: function(isAbsolute) {
			return range(this.namePosition(isAbsolute), this.name());
		},
		
		/**
		 * Returns element value range
		 * @param {Boolean} isAbsolute Return absolute range
		 * @returns {Range}
		 */
		valueRange: function(isAbsolute) {
			return range(this.valuePosition(isAbsolute), this.value());
		},
		
		/**
		 * Returns current element string representation
		 * @returns {String}
		 */
		toString: function() {
			return this.valueOf();
		},
		
		valueOf: function() {
			return this.name() + this.value();
		}
	};
	
	return {
		EditContainer: EditContainer,
		EditElement: EditElement,
		
		/**
		 * Creates token that can be fed to <code>EditElement</code>
		 * @param {Number} start
		 * @param {String} value
		 * @param {String} type
		 * @returns
		 */
		createToken: function(start, value, type) {
			var obj = {
				start: start || 0,
				value: value || '',
				type: type
			};
			
			obj.end = obj.start + obj.value.length;
			return obj;
		}
	};
});