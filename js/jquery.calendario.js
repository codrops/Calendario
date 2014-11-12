/**
 * jquery.calendario.js v3.0.0
 * http://www.codrops.com
 *
 * Licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 * 
 * Copyright 2014, Codrops
 * http://www.codrops.com
 *
 * || Notable Changes ||
 * Calendario gets more flexible : Boží Ďábel (https://github.com/deviprsd21) (https://github.com/codrops/Calendario/pull/11)
 * Multiple Events : Mattias Lyckne (https://github.com/olyckne) (https://github.com/codrops/Calendario/pull/22)
 * Flexibility In-built : Boží Ďábel (https://github.com/deviprsd21) (https://github.com/codrops/Calendario/pull/23)
 */
;( function( $, window, undefined ) {
	
	'use strict';

	$.Calendario = function( options, element ) {
		this.$el = $( element );
		this._init( options );	
	};

	// the options
	$.Calendario.defaults = {
		/*
		you can also pass:
		month : initialize calendar with this month (1-12). Default is today.
		year : initialize calendar with this year. Default is today.
		caldata : initial data/content for the calendar.
		caldata format:
		{
			'MM-DD-YYYY' : 'HTML Content',
			'MM-DD-YYYY' : 'HTML Content',
			'MM-DD-YYYY' : 'HTML Content'
			...
		}
		*/
		weeks : [ 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday' ],
		weekabbrs : [ 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat' ],
		months : [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ],
		monthabbrs : [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ],
		// choose between values in options.weeks or options.weekabbrs
		displayWeekAbbr : false,
		// choose between values in options.months or options.monthabbrs
		displayMonthAbbr : false,
		// left most day in the calendar
		// 0 - Sunday, 1 - Monday, ... , 6 - Saturday
		startIn : 1,
		events: 'click',
		fillEmpty: true
	};

	$.Calendario.prototype = {
		_init : function( options ) {
			// options
			this.options = $.extend( true, {}, $.Calendario.defaults, options );
			this.today = new Date();
			this.month = ( isNaN( this.options.month ) || this.options.month == null) ? this.today.getMonth() : this.options.month - 1;
			this.year = ( isNaN( this.options.year ) || this.options.year == null) ? this.today.getFullYear() : this.options.year;
			this.caldata = this.options.caldata || {};
			if(parseFloat($().jquery) >= 1.9 && this.options.events.indexOf('hover') != -1) logError('\'hover\' psuedo-name is not supported'
				+ ' in jQuery 1.9+. Use \'mouseenter\' \'mouseleave\' events instead.');
			this.options.events = this.options.events.split(',');
			this._generateTemplate();
			this._initEvents();
		},
		
		_propDate: function($cell, event) {
			var self = this,
			idx = $cell.index(),
			$content = $cell.children( 'div' ),
			dateProp = {
				day : $cell.children( 'span.fc-date' ).text(),
				month : self.month + 1,
				monthname : self.options.displayMonthAbbr ? self.options.monthabbrs[ self.month ] : self.options.months[ self.month ],
				year : self.year,
				weekday : idx + self.options.startIn,
				weekdayname : self.options.weeks[ (idx==6?0:idx + self.options.startIn) ]
			};
			if( dateProp.day )
				self.options[event]( $cell, $content, dateProp );
		},
		
		_initEvents : function() {
			var self = this, event = [], calendarioEventNameFormat = [], type = '';
			for(var i = 0; i < self.options.events.length; i++)
			{
				event[i] = self.options.events[i].toLowerCase().trim();
				calendarioEventNameFormat[i] = 'onDay' + event[i].charAt(0).toUpperCase() + event[i].slice(1);
				if(this.options[calendarioEventNameFormat[i]] === undefined)
					this.options[calendarioEventNameFormat[i]] = function($el, $content, dateProperties) {return false};
				this.$el.on(event[i] + '.calendario', 'div.fc-row > div', function(e) {
				    if(e.type == 'mouseenter' || e.type == 'mouseleave') {
						if($.inArray(e.type, event) == -1) type = 'hover';
						else type = e.type;
					} else { 
						type = e.type;
					}
					self._propDate($(this), calendarioEventNameFormat[$.inArray(type, event)]);
				});
			}
		},
		// Calendar logic based on http://jszen.blogspot.pt/2007/03/how-to-build-simple-calendar-with.html
		_generateTemplate : function( callback ) {
			var head = this._getHead(),
				body = this._getBody(),
				rowClass;

			switch( this.rowTotal ) {
				case 4 : rowClass = 'fc-four-rows'; break;
				case 5 : rowClass = 'fc-five-rows'; break;
				case 6 : rowClass = 'fc-six-rows'; break;
			}
			this.$cal = $( '<div class="fc-calendar ' + rowClass + '">' ).append( head, body );
			this.$el.find( 'div.fc-calendar' ).remove().end().append( this.$cal );
			this.$el.find('.fc-emptydate').parent().css({'background':'transparent', 'cursor':'default'});
			if( callback ) { callback.call(); }
		},
		
		_getHead : function() {
			var html = '<div class="fc-head">';
			for ( var i = 0; i <= 6; i++ ) {
				var pos = i + this.options.startIn,
					j = pos > 6 ? pos - 6 - 1 : pos;

				html += '<div>';
				html += this.options.displayWeekAbbr ? this.options.weekabbrs[ j ] : this.options.weeks[ j ];
				html += '</div>';
			}
			html += '</div>';
			return html;
		},
		
		_parseDataToDay : function (data, day) {
			var content = '';
			if( !day ) {
				if (Array.isArray(data)) 
					return this._convertDayArray(data);
				else 
					return this._wrapDay(data);

			} else {
				if ( !Array.isArray(data))
					data = [data];
				for (var i = 0; i < data.length; i++) {
					if( data[i]['start'] && data[i]['end'] ) {
						if( (day >= data[i]['start']) && (day <= data[i]['end']) ) 
							content += this._wrapDay(data[i]['content']);
					} else if( data[i]['start'] > 1 ) {
						if( day >= data[i]['start'] )
							content += this._wrapDay(data[i]['content']);
					} else if( data[i]['end'] > 0 ) {
						if( day <= data[i]['end'] ) 
							content += this._wrapDay(data[i]['content']);
					} else {
						if( data[i]['content'] )
							content += this._wrapDay(data[i]['content']);
						else 
							content += this._wrapDay(data[i]);
					}
				}
				return content;
			}
		},
		
		_wrapDay: function (day) {
			return '<div class="fc-calendar-event">' + day + '</div>';
		},
		
		_convertDayArray: function (day) {
			return this._wrapDay(day.join('</div><div class="fc-calendar-event">'));
		},
		
		_getBody : function() {
			var d = new Date( this.year, this.month + 1, 0 ),
				// number of days in the month
				monthLength = d.getDate(),
				firstDay = new Date( this.year, this.month, 1 ),
				pMonthLength = new Date( this.year, this.month, 0 ).getDate();

			// day of the week
			this.startingDay = firstDay.getDay();

			var html = '<div class="fc-body"><div class="fc-row">',
				// fill in the days
				day = 1;

			// this loop is for weeks (rows)
			for ( var i = 0; i < 7; i++ ) {
				// this loop is for weekdays (cells)
				for ( var j = 0; j <= 6; j++ ) {
					var pos = this.startingDay - this.options.startIn,
						p = pos < 0 ? 6 + pos + 1 : pos,
						inner = '',
						today = this.month === this.today.getMonth() && this.year === this.today.getFullYear() && day === this.today.getDate(),
						past = this.year < this.today.getFullYear() || this.month < this.today.getMonth() && this.year === this.today.getFullYear() 
						|| this.month === this.today.getMonth() && this.year === this.today.getFullYear() && day < this.today.getDate(),
						content = '';

					if(this.options.fillEmpty && (j < p || i > 0)) {
						if(day > monthLength) {
							inner = '<span class="fc-date fc-emptydate">' + (day - monthLength) + '</span><span class="fc-weekday">';
							++day;
						} else if (day == 1) {
							inner = '<span class="fc-date fc-emptydate">' + (pMonthLength - p + 1) + '</span><span class="fc-weekday">';
							++pMonthLength;
						}
						inner += this.options.weekabbrs[ j + this.options.startIn > 6 ? j + this.options.startIn - 6 - 1 : j + this.options.startIn 
						] + '</span>';
					}
					if ( day <= monthLength && ( i > 0 || j >= p ) ) {

						inner = '<span class="fc-date">' + day + '</span><span class="fc-weekday">' + this.options.weekabbrs[ j + 
						this.options.startIn > 6 ? j + this.options.startIn - 6 - 1 : j + this.options.startIn ] + '</span>';

						// this day is:
						var strdate = ( this.month + 1 < 10 ? '0' + ( this.month + 1 ) : this.month + 1 ) + '-' + ( day < 10 ? '0' + day : day ) + 
						'-' + this.year, dayData = this.caldata[ strdate ];
						var strdateyear = ( this.month + 1 < 10 ? '0' + ( this.month + 1 ) : this.month + 1 ) + '-' + ( day < 10 ? '0' + day : day )
						+ '-' + 'YYYY', dayDataYear = this.caldata[ strdateyear ];
						var strdatemonth = 'MM' + '-' + ( day < 10 ? '0' + day : day ) + '-' + this.year,
							dayDataMonth = this.caldata[ strdatemonth ];
						var strdatemonthyear = 'MM' + '-' + ( day < 10 ? '0' + day : day ) + '-' + 'YYYY',
							dayDataMonthYear = this.caldata[ strdatemonthyear ];
						var strdatemonthlyyear = ( this.month + 1 < 10 ? '0' + ( this.month + 1 ) : this.month + 1 ) + '-' + 'DD' + '-' + this.year,
							dayDataMonthlyYear = this.caldata[ strdatemonthlyyear ];
						var strdatemonthly = ( this.month + 1 < 10 ? '0' + ( this.month + 1 ) : this.month + 1 ) + '-' + 'DD' + '-' + 'YYYY',
							dayDataMonthly = this.caldata[ strdatemonthly ];
						
						if( today ) {
							var dayDataToday = this.caldata[ "TODAY" ];
							if( dayDataToday ) {
								content += this._parseDataToDay( dayDataToday );
							}
						}
						if( dayData ) 
							content += this._parseDataToDay( dayData );
						if( dayDataMonth ) 
							content += this._parseDataToDay( dayDataMonth );
						if( dayDataMonthlyYear ) 
							content += this._parseDataToDay( dayDataMonthlyYear, day );
						if( dayDataMonthly ) 
							content += this._parseDataToDay( dayDataMonthly, day );
						if( dayDataMonthYear )
							content += this._parseDataToDay( dayDataMonthYear );
						if( dayDataYear )
							content += this._parseDataToDay( dayDataYear );

						if( content !== '' )
							inner += '<div class="fc-calendar-events">' + content + '</div>';
						++day;
					}
					else {
						today = false;
					}
					
					var cellClasses = today ? 'fc-today ' : '';
					if ( past )
		              cellClasses += 'fc-past ';
					else 
						cellClasses += 'fc-future ';

					if( content !== '' )
						cellClasses += 'fc-content';
					
					html += cellClasses !== '' ? '<div class="' + cellClasses.trim() + '">' : '<div>';
					html += inner;
					html += '</div>';
				}
				// stop making rows if we've run out of days
				if (day > monthLength) {
					this.rowTotal = i + 1;
					break;
				} 
				else {
					html += '</div><div class="fc-row">';
				}
			}
			html += '</div></div>';
			return html;
		},
		
		_move : function( period, dir, callback ) {
			if( dir === 'previous' ) {
				if( period === 'month' ) {
					this.year = this.month > 0 ? this.year : --this.year;
					this.month = this.month > 0 ? --this.month : 11;
				} else if( period === 'year' ) {
					this.year = --this.year;
				}
			}
			else if( dir === 'next' ) {
				if( period === 'month' ) {
					this.year = this.month < 11 ? this.year : ++this.year;
					this.month = this.month < 11 ? ++this.month : 0;
				} else if( period === 'year' ) {
					this.year = ++this.year;
				}
			}

			this._generateTemplate( callback );
		},
		
		/************************* 
		******PUBLIC METHODS *****
		**************************/
		getYear : function() {
			return this.year;
		},
		getMonth : function() {
			return this.month + 1;
		},
		getMonthName : function() {
			return this.options.displayMonthAbbr ? this.options.monthabbrs[ this.month ] : this.options.months[ this.month ];
		},
		// gets the cell's content div associated to a day of the current displayed month
		// day : 1 - [28||29||30||31]
		getCell : function( day ) {
			var row = Math.floor( ( day + this.startingDay - this.options.startIn ) / 7 ),
				pos = day + this.startingDay - this.options.startIn - ( row * 7 ) - 1;

			return this.$cal.find( 'div.fc-body' ).children( 'div.fc-row' ).eq( row ).children( 'div' ).eq( pos ).children( 'div' );
		},
		setData : function( caldata ) {
			caldata = caldata || {};
			$.extend( this.caldata, caldata );
			this._generateTemplate();
		},
		// goes to today's month/year
		gotoNow : function( callback ) {
			this.month = this.today.getMonth();
			this.year = this.today.getFullYear();
			this._generateTemplate( callback );
		},
		// goes to month/year
		gotoMonth : function( month, year, callback ) {
			this.month = month - 1;
			this.year = year;
			this._generateTemplate( callback );
		},
		gotoPreviousMonth : function( callback ) {
			this._move( 'month', 'previous', callback );
		},
		gotoPreviousYear : function( callback ) {
			this._move( 'year', 'previous', callback );
		},
		gotoNextMonth : function( callback ) {
			this._move( 'month', 'next', callback );
		},
		gotoNextYear : function( callback ) {
			this._move( 'year', 'next', callback );
		}
	};
	
	var logError = function( message ) {
		throw new Error(message);
	};
	
	$.fn.calendario = function( options ) {
		var instance = $.data( this, 'calendario' );
		if ( typeof options === 'string' ) {	
			var args = Array.prototype.slice.call( arguments, 1 );	
			this.each(function() {
				if ( !instance ) {
					logError( "cannot call methods on calendario prior to initialization; " +
					"attempted to call method '" + options + "'" );
					return;
				}
				if ( !$.isFunction( instance[options] ) || options.charAt(0) === "_" ) {
					logError( "no such method '" + options + "' for calendario instance" );
					return;
				}
				instance[ options ].apply( instance, args );
			});
		} 
		else {
			this.each(function() {	
				if ( instance ) 
					instance._init();
				else
					instance = $.data( this, 'calendario', new $.Calendario( options, this ) );
			});
		}
		return instance;
	};
} )( jQuery, window );
