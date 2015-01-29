/**
 * jquery.calendario.js v3.2.0
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
 * Now with Time : Boží Ďábel (https://github.com/deviprsd21) (https://github.com/codrops/Calendario/pull/25)
 */
;(function($, window, undefined){ 
  'use strict';

  $.Calendario = function(options, element){
    this.$el = $(element);
    this._init(options);  
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
          ...
      }
    */
    weeks : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    weekabbrs : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    months : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    monthabbrs : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    displayWeekAbbr : false, // choose between values in options.weeks or options.weekabbrs
    displayMonthAbbr : false, // choose between values in options.months or options.monthabbrs
    startIn : 1, // left most day in the calendar (0 - Sunday, 1 - Monday, ... , 6 - Saturday)
    events: 'click',
    fillEmpty: true,
    feedParser: './feed/',
    zone: '00:00', // Ex: IST zone time is '+05:30' by default it is GMT, Sign is important.
    checkUpdate: true //Check if any new version of Calendario is released (Details will be in the browser console)
  };

  $.Calendario.prototype = {
    _init : function(options){
      // options
      this.VERSION = '3.2.0';
      this.UNIQUE = '%{unique}%'; //UNIQUE helps us differentiate your js from others and help us keep a track of run time.
      this.options = $.extend(true, {}, $.Calendario.defaults, options);
      this.today = new Date();
      this.month = (isNaN(this.options.month) || this.options.month === null) ? this.today.getMonth() : this.options.month - 1;
      this.year = (isNaN(this.options.year) || this.options.year === null) ? this.today.getFullYear() : this.options.year;
      this.caldata = this._processCaldata(this.options.caldata);
      // if hover is passed as an event then throw error if jQuery is 1.9 or above 1.9, because, hover psuedo name isn't supported
      if(parseFloat($().jquery) >= 1.9 && this.options.events.indexOf('hover') != -1) 
        this.logError('\'hover\' psuedo-name is not supported' + ' in jQuery 1.9+. Use \'mouseenter\' \'mouseleave\' events instead.');
        
      this.options.events = this.options.events.split(',');
      this.options.zone = this.options.zone.charAt(0) != '+' && this.options.zone.charAt(0) != '-' ? '+' + this.options.zone : this.options.zone;
      this._generateTemplate(true);
      this._initEvents();
    },
    
    _processCaldataObj: function(val, key){
      if(typeof val !== 'object') val = {content: val, startTime: '00:00', endTime: '23:59', allDay: true};
      if(!val.content) this.logError('Content is missing in date ' + key);
      if(val.startTime && !val.endTime) val.endTime = parseInt(val.startTime.split(':')[0]) + 1 + ':' + val.startTime.split(':')[1];
      if(!val.startTime && !val.endTime) val = $.extend({}, val, {startTime: '00:00', endTime: '23:59', allDay: true});
      if(val.startTime && val.endTime && val.allDay === undefined) val.allDay = false;
      if(/^\d{2}-DD-\d{4}/.test(key) || /^\d{2}-DD-YYYY/.test(key)) {
        var det = /^(\d{2})-DD-(\d{4})/.exec(key) || /^(\d{2})-DD-YYYY/.exec(key), chkDate;
        if(det.length == 3) chkDate = new Date(det[2], det[1], 0);
        else if(det.length == 2) chkDate = new Date(this.year, det[1], 0)
        if(!val.startDate) val.startDate = 1;
        if(!val.endDate && chkDate.getDate() != 1) val.endDate = chkDate.getDate();
        if(!val.endDate && chkDate.getDate() == 1 && det.length == 3) val.endDate = chkDate.getDate();
      }
      return val;
    },
    
    _processCaldata: function(caldata){
      var self = this;
      caldata = caldata || {};
      $.each(caldata, function(key, val){
        if(/^\d{2}-\d{2}-\d{4}/.test(key) || /^\d{2}-\d{2}-YYYY/.test(key) || /^\d{2}-DD-YYYY/.test(key) || /^MM-\d{2}-YYYY/.test(key) ||
        /^\d{2}-DD-YYYY/.test(key) || /^MM-\d{2}-\d{4}/.test(key) || /^\d{2}-DD-\d{4}/.test(key) || key == 'TODAY') {} else
          self.logError(key + ' is an Invalid Date. Date should not contain spaces, should be separated by \'-\' and should be in the ' + 
          'format \'MM-DD-YYYY\'. That ain\'t that difficult!');
        if(Array.isArray(val)) {
          $.each(val, function(i, c){
            val[i] = self._processCaldataObj(c, key);
          });
          caldata[key] = val;
        } else {
          caldata[key] = self._processCaldataObj(val, key);
        }
      });
      return caldata;
    },  
     
    _propDate: function($cell, event){
      var idx = $cell.index(),
          data = {allDay : [], content: [], endTime: [], startTime: []},
          dateProp = {
            day : $cell.children('span.fc-date').text(),
            month : this.month + 1,
            monthname : this.options.displayMonthAbbr ? this.options.monthabbrs[this.month] : this.options.months[this.month],
            year : this.year,
            weekday : idx + this.options.startIn,
            weekdayname : this.options.weeks[(idx==6?0:idx + this.options.startIn)]
          };
          
      $cell.children( 'div.fc-calendar-events').children('div.fc-calendar-event').each(function(i, e){
        var $html = $('<div>' + $(e).html() + '</div>');
        data.startTime[i] = new Date($html.find('time.fc-starttime').attr('datetime'));
        data.endTime[i] = new Date($html.find('time.fc-endtime').attr('datetime'));
        data.allDay[i] = $html.find('time.fc-allday').attr('datetime') === 'true' ? true : false;
        $html.find('time').remove();
        data.content[i] = $html.html();
      });
      
      if(dateProp.day) this.options[event]($cell, data, dateProp);
    },
        
    _initEvents : function() {
      var self = this, event = [], calendarioEventNameFormat = [];
      for(var i = 0; i < self.options.events.length; i++) {
        event[i] = self.options.events[i].toLowerCase().trim();
        calendarioEventNameFormat[i] = 'onDay' + event[i].charAt(0).toUpperCase() + event[i].slice(1);
        
        if(this.options[calendarioEventNameFormat[i]] === undefined)
          this.options[calendarioEventNameFormat[i]] = function($el, $content, dateProperties) {return false;};
                
        this.$el.on(event[i] + '.calendario', 'div.fc-row > div', function(e) {
          if(e.type == 'mouseenter' || e.type == 'mouseleave') e.type = $.inArray(e.type, event) == -1 ? 'hover' : e.type;
          self._propDate($(this), calendarioEventNameFormat[$.inArray(e.type, event)]);
        });
      }
      this.$el.on('shown.calendar.calendario', function(e, instance){
        // If check update set to true, then contact calendario's update servers for details. We didn't want to slow down your code. So we
        // check after the calendar is rendered.
        if(instance && instance.options.checkUpdate) self._checkUpdate();
      });
      // newday trigger. This trigger is exactly triggered at 00:00 hours the next day with an uncertainty of 6ms.
      this.$el.delay(new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate() + 1, 0, 0, 0) - new Date().getTime())
      .queue(function(){
        self.today = new Date();
        if(self.today.getMonth() == self.month || self.today.getMonth() + 1 == self.month) self._generateTemplate(true);
        self.$el.trigger($.Event('newday.calendar.calendario'));
      });
    },
        
    _checkUpdate : function() {
      var self = this;
      $.getScript("https://raw.githubusercontent.com/codrops/Calendario/master/js/update.js")
      .done(function(script, textStatus){
        if(calendario.current != self.version() && parseFloat(calendario.current) >= parseFloat(self.version())) 
          console.info(calendario.msg);
      })
      .fail(function(jqxhr, settings, exception){
        console.error(exception);
      });
    },
    
    // Calendar logic based on http://jszen.blogspot.pt/2007/03/how-to-build-simple-calendar-with.html
    _generateTemplate : function(firstRun, callback) {
      var head = this._getHead(),
          body = this._getBody(),
          rowClass;

      switch(this.rowTotal) {
        case 4 : rowClass = 'fc-four-rows'; break;
        case 5 : rowClass = 'fc-five-rows'; break;
        case 6 : rowClass = 'fc-six-rows'; break;
      }
    
      this.$cal = $('<div class="fc-calendar ' + rowClass + '">').append(head, body);
      this.$el.find('div.fc-calendar').remove().end().append(this.$cal);
      this.$el.find('.fc-emptydate').parent().css({'background':'transparent', 'cursor':'default'});
      
      if(!firstRun) this.$el.trigger($.Event('shown.calendario'));
      if(callback) callback.call();
    },
        
    _getHead : function() {
      var html = '<div class="fc-head">';
      for(var i = 0; i <= 6; i++){
        var pos = i + this.options.startIn,
            j = pos > 6 ? pos - 6 - 1 : pos;
            html += '<div>' + (this.options.displayWeekAbbr ? this.options.weekabbrs[j] : this.options.weeks[j]) + '</div>';
      }
      return html + '</div>';
    },
        
    _parseDataToDay : function (data, day, other) {
      var content = '';
      if(!other){
        if(Array.isArray(data)) content = this._convertDayArray(data, day);
        else content = this._wrapDay(data, day, true);
      }else{
        if (!Array.isArray(data)) data = [data];
        for(var i = 0; i < data.length; i++){
          if(this.month != 1 && (day >= data[i].startDate) && (day <= data[i].endDate)) content += this._wrapDay(data[i], day, true);
          else if(this.month == 1 && (day >= data[i].startDate)){
            if(data[i].endDate && (day <= data[i].endDate)) content += this._wrapDay(data[i], day, true);
            else if(!data[i].endDate) content += this._wrapDay(data[i], day, true);
          }
        }
      }
      return content;
    },
        
    _toDateTime : function(time, day, start) {
      var zoneH = parseInt(this.options.zone.split(':')[0]),
          zoneM = parseInt(this.options.zone.charAt(0) + this.options.zone.split(':')[1]),
          hour = parseInt(time.split(':')[0]) - zoneH,
          minutes = parseInt(time.split(':')[1]) - zoneM,
          d = new Date(Date.UTC(this.year, this.month, day, hour, minutes, 0, 0));
      if(start) {
        var hStart = parseInt(start.split(':')[0]) - zoneH,
            mStart = parseInt(start.split(':')[1]) - zoneM;
        if(d.getTime() - new Date(Date.UTC(this.year, this.month, day, hStart, mStart, 0, 0)).getTime() < 0)
            d =  new Date(Date.UTC(this.year, this.month, day + 1, hour, minutes, 0, 0));
      }
      return d.toISOString();
    },
        
    _timeHtml : function(day, date){
      var content = day.content;
      content += '<time class="fc-allday" datetime="' + day.allDay + '"></time>';
      content += '<time class="fc-starttime" datetime="' + this._toDateTime(day.startTime, date) + '">' + day.startTime + '</time>';
      content += '<time class="fc-endtime" datetime="' + this._toDateTime(day.endTime, date, day.startTime) + '">' + day.endTime + '</time>';
      return content;
    },
        
    _wrapDay: function (day, date, wrap) {
      if(date){
        if(wrap) return '<div class="fc-calendar-event">' + this._timeHtml(day, date) + '</div>';
        else return this._timeHtml(day, date);
      } else return '<div class="fc-calendar-event">' + day + '</div>';
    },
        
    _convertDayArray: function (day, date) {
      var wrap_days = []
      for(var i = 0; i < day.length; i++){
        wrap_days[i] = this._wrapDay(day[i], date, false);
      }
      return this._wrapDay(wrap_days.join('</div><div class="fc-calendar-event">'));
    },
        
    _getBody : function() {
      var d = new Date(this.year, this.month + 1, 0),
          monthLength = d.getDate(), // number of days in the month
          firstDay = new Date(this.year, d.getMonth(), 1),
          pMonthLength = new Date(this.year, this.month, 0).getDate();

      // day of the week
      this.startingDay = firstDay.getDay();

      var html = '<div class="fc-body"><div class="fc-row">',
          day = 1; // fill in the days

      for (var i = 0; i < 7; i++){ // this loop is for weeks (rows)
        for (var j = 0; j <= 6; j++) { // this loop is for weekdays (cells)
          var pos = this.startingDay - this.options.startIn,
              p = pos < 0 ? 6 + pos + 1 : pos,
              inner = '',
              today = this.month === this.today.getMonth() && this.year === this.today.getFullYear() && day === this.today.getDate(),
              past = this.year < this.today.getFullYear() || this.month < this.today.getMonth() && this.year === this.today.getFullYear() ||
                     this.month === this.today.getMonth() && this.year === this.today.getFullYear() && day < this.today.getDate(),
              content = '';

          if(this.options.fillEmpty && (j < p || i > 0)){
            if(day > monthLength) {
              inner = '<span class="fc-date fc-emptydate">' + (day - monthLength) + '</span><span class="fc-weekday">';
              ++day;
            } else if (day == 1) {
              inner = '<span class="fc-date fc-emptydate">' + (pMonthLength - p + 1) + '</span><span class="fc-weekday">';
              ++pMonthLength;
            }
            inner += this.options.weekabbrs[j + this.options.startIn > 6 ? j + this.options.startIn - 6 - 1 : j + this.options.startIn] + '</span>';
          }
          if (day <= monthLength && (i > 0 || j >= p)){
            inner = '<span class="fc-date">' + day + '</span><span class="fc-weekday">' + this.options.weekabbrs[j + 
                    this.options.startIn > 6 ? j + this.options.startIn - 6 - 1 : j + this.options.startIn ] + '</span>';
            
            var strdate = (this.month + 1 < 10 ? '0' + (this.month + 1) : this.month + 1) + '-' + (day < 10 ? '0' + day : day) + '-' + this.year, 
                dayData = this.caldata[strdate],
                strdateyear = (this.month + 1 < 10 ? '0' + (this.month + 1) : this.month + 1) + '-' + (day < 10 ? '0' + day : day) + '-YYYY',
                dayDataYear = this.caldata[strdateyear],
                strdatemonth = 'MM-' + (day < 10 ? '0' + day : day) + '-' + this.year,
                dayDataMonth = this.caldata[strdatemonth],
                strdatemonthyear = 'MM' + '-' + (day < 10 ? '0' + day : day) + '-YYYY',
                dayDataMonthYear = this.caldata[strdatemonthyear],
                strdatemonthlyyear = (this.month + 1 < 10 ? '0' + (this.month + 1) : this.month + 1) + '-DD-' + this.year,
                dayDataMonthlyYear = this.caldata[strdatemonthlyyear],
                strdatemonthly = (this.month + 1 < 10 ? '0' + (this.month + 1) : this.month + 1) + '-DD-YYYY',
                dayDataMonthly = this.caldata[strdatemonthly];
    
            if(today && this.caldata.TODAY) content += this._parseDataToDay(this.caldata.TODAY, day);
            if(dayData) content += this._parseDataToDay(dayData, day);
            if(dayDataMonth) content += this._parseDataToDay(dayDataMonth, day);
            if(dayDataMonthlyYear) content += this._parseDataToDay(dayDataMonthlyYear, day, true);
            if(dayDataMonthly) content += this._parseDataToDay(dayDataMonthly, day, true);
            if(dayDataMonthYear) content += this._parseDataToDay( dayDataMonthYear, day );
            if(dayDataYear) content += this._parseDataToDay( dayDataYear, day );
            if(content !== '') inner += '<div class="fc-calendar-events">' + content + '</div>';
            ++day;
          } else {
            today = false;
          }

          var cellClasses = today ? 'fc-today ' : '';

          if(past) cellClasses += 'fc-past ';
          else cellClasses += 'fc-future ';

          if(content !== '') cellClasses += 'fc-content';
          
          html += (cellClasses !== '' ? '<div class="' + cellClasses.trim() + '">' : '<div>') + inner + '</div>';
        }

        if(day > monthLength){ // stop making rows if we've run out of days
          this.rowTotal = i + 1;
          break;
        } else {
          html += '</div><div class="fc-row">';
        }
      }
      return html + '</div></div>';
    },
        
    _move : function(period, dir, callback){
      if(dir === 'previous'){
        if(period === 'month'){
          this.year = this.month > 0 ? this.year : --this.year;
          this.month = this.month > 0 ? --this.month : 11;
        } else if(period === 'year') this.year = --this.year;
      }
      else if(dir === 'next'){
        if(period === 'month'){
          this.year = this.month < 11 ? this.year : ++this.year;
          this.month = this.month < 11 ? ++this.month : 0;
        } else if(period === 'year') this.year = ++this.year;
      }
      this._generateTemplate(false, callback);
    },
        
    /************************* 
    ***** PUBLIC METHODS *****
    **************************/
    option : function(option, value) {
      if(value) this.options[option] = value;
      else return this.options[option];
    },
    getYear : function(){
      return this.year;
    },
    getMonth : function(){
      return this.month + 1;
    },
    getMonthName : function(){
      return this.options.displayMonthAbbr ? this.options.monthabbrs[this.month] : this.options.months[this.month];
    },
    // gets the cell's content div associated to a day of the current displayed month
    // day : 1 - [28||29||30||31]
    getCell : function(day){
      var row = Math.floor((day + this.startingDay - this.options.startIn - 1) / 7),
          pos = day + this.startingDay - this.options.startIn - (row * 7) - 1;
      return this.$cal.find('div.fc-body').children('div.fc-row').eq(row).children('div').eq(pos);
    },
    setData : function(caldata, clear) {
      caldata = this._processCaldata(caldata);
      if(clear) this.caldata = caldata;
      else $.extend(this.caldata, caldata);
      this._generateTemplate(false);
    },
    // goes to today's month/year
    gotoNow : function(callback) {
      this.month = this.today.getMonth();
      this.year = this.today.getFullYear();
      this._generateTemplate(false, callback);
    },
    // goes to month/year
    gotoMonth : function(month, year, callback){
      this.month = month - 1;
      this.year = year;
      this._generateTemplate(false, callback);
    },
    gotoPreviousMonth : function(callback){
      this._move('month', 'previous', callback);
    },
    gotoPreviousYear : function(callback){
      this._move('year', 'previous', callback);
    },
    gotoNextMonth : function(callback){
      this._move('month', 'next', callback);
    },
    gotoNextYear : function(callback){
      this._move('year', 'next', callback);
    },
    feed : function(callback){
      var self = this;
      $.post(self.options.feedParser, {dates: this.caldata})
      .always(function(data){
        if(callback) callback.call(this, JSON.parse(data).hevent);
      });
    },
    version : function() {
      return this.VERSION;
    }
  };
    
  var logError = function(message){
    throw new Error(message);
  };
    
  $.fn.calendario = function(options) {
    var instance = $.data(this, 'calendario');
    if(typeof options === 'string'){    
      var args = Array.prototype.slice.call(arguments, 1);  
      this.each(function(){
        if(!instance){
          logError("Cannot call methods on calendario prior to initialization; Attempted to call method '" + options + "'");
          return;
        }
        if (!$.isFunction(instance[options]) || options.charAt(0) === "_"){
          logError("No such method '" + options + "' for calendario instance.");
        }
        instance[options].apply(instance, args);
      });
    } else {
      this.each(function(){
        if (instance) instance._init();
        else instance = $.data(this, 'calendario', new $.Calendario(options, this));
      });
    }
    instance.$el.trigger($.Event('shown.calendar.calendario'), [instance]);
    return instance;
  };
})(jQuery, window);
