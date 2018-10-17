/*
 * spa.chat.js
 * Chat feature module for SPA
 */
/*jslint         browser : true, continue : true,
        devel  : true, indent  : 2,    maxerr   : 50,
        newcap : true, nomen   : true, plusplus : true,
        regexp : true, sloppy  : true, vars     : true,
        white  : true
      */

/* global &,spa */
spa.chat = (function () {
  // Begin module scope variables
  var
    configMap = { // 保存模块配置
      main_html: String() // 用HTML模板来填充聊天滑块容器
        + '<div class="spa-chat">'
        + '   <div class="spa-chat-head">'
        + '     <div class="spa-chat-head-toggle">+</div>'
        + '     <div class="spa-chat-head-title">'
        + '       Chat'
        + '     </div>'
        + '   </div>'
        + '   <div class="spa-chat-closer">x</div>'
        + '   <div class="spa-chat-sizer">'
        + '     <div class="spa-chat-msgs"></div>'
        + '     <div class="spa-chat-box">'
        + '       <input type="text" />'
        + '       <div>send</div>'
        + '     </div>'
        + '   </div>'
        + '</div>',
      settable_map: { // 存储chat模块所有的设置
        slider_open_time: true,
        slider_close_time: true,
        slider_opened_em: true,
        slider_closed_em: true,
        slider_opened_title: true,
        slider_closed_title: true,
        chat_model: true,
        people_model: true,
        set_chat_anchor: true
      },

      slider_open_time: 250,
      slider_close_time: 250,
      slider_opened_em: 16,
      slider_closed_em: 2,
      slider_opened_title: 'Click to close',
      slider_closed_title: 'Click to open',

      chat_model: null,
      people_model: null,
      set_chat_anchor: null
    },
    stateMap = {  // 保存运行时的状态值
      $append_target: null,
      position_type: 'closed',
      px_per_em: 0,
      slider_hidden_px: 0,
      slider_closed_px: 0,
      slider_opened_px: 0
    },
    jqueryMap = {}, // 缓存jQuery集合
    setJqueryMap, getEmSize, setPxSizes, setSliderPosition, onClickToggle,
    configModule, initModule;
  // End module scope variables

  // --------------Begin utility methods 所有的私有工具方法聚集区块里面，这些方法不会操作DOM，不需要浏览器就能运行--------------
  /*将em显示单位转换为像素*/
  getEmSize = function (elem) {
    return Number(getComputedStyle(elem, '').fontSize.match(/\d*\.?\d*/)[0]);
  };
  // --------------End utility methods--------------

  // --------------Begin DOM methods 所有私有的DOM方法聚集在区块里面，访问和修改DOM，需要浏览器才能运行--------------
  // Begin DOM method / setJqueryMap /
  setJqueryMap = function () {
    var
      $append_target = stateMap.$append_target,
      $slider = $append_target.find('.spa-chat');
    jqueryMap = {
      $slider: $slider,
      $head: $slider.find('.spa-chat-head'),
      $toggle: $slider.find('.spa-chat-head-toggle'),
      $title: $slider.find('.spa-chat-head-title'),
      $sizer: $slider.find('.spa-chat-sizer'),
      $msgs: $slider.find('.spa-chat-msgs'),
      $box: $slider.find('.spa-chat-box'),
      $input: $slider.find('.spa-chat-input input[type=text]')
    };
  };
  // End DOM method / setJqueryMap /

  // Begin DOM method /setJqueryMap/
  /*计算由该模块管理的元素的尺寸*/
  setPxSizes = function () {
    var px_per_em, opened_height_em;
    px_per_em = getEmSize(jqueryMap.$slider.get(0));
    opened_height_em = configMap.slider_opened_em;
    stateMap.px_per_em = px_per_em;
    stateMap.slider_closed_px = configMap.slider_closed_em * px_per_em;
    stateMap.slider_opened_px = opened_height_em * px_per_em;
    jqueryMap.$sizer.css({
      height: (opened_height_em - 2) * px_per_em
    });
  };
  // End DOM method /setPxSizes/

  // Begin public method /setSliderPosition/
  // Example : spa.chat.setSliderPosition('closed')
  // Purpose : Move the chat slider to the requested position
  // Arguments : // * position_type - enum ('closed', 'opened', or 'hidden')
  // * callback - optional callback to the run end at the end
  // of slider animation. The callback receives a jQuery collection representing the slider div as its single argument
  // Actions: This method moves the slider into the requested position.
  // If the requested position is the current position, it returns ture without taking further action
  // Returns:
  // * true - The requested position was achieved
  // * false - The requested position was not achieved
  // Throws : none
  //
  setSliderPosition = function (position_type, callback) {
    var
      height_px, animate_time, slider_title, toggle_text;
    // return true if slider already in requested position
    if (stateMap.position_type === position_type) {
      return true;
    }
    // prepare animation parameters
    switch (position_type) {
      case 'opened':
        height_px = stateMap.slider_opened_px;
        animate_time = configMap.slider_open_time;
        slider_title = configMap.slider_opened_title;
        toggle_text = '=';
        break;
      case 'hidden':
        height_px = 0;
        animate_time = configMap.slider_open_time;
        slider_title = '';
        toggle_text = '+';
        break;
      case 'closed':
        height_px = stateMap.slider_closed_px;
        animate_time = configMap.slider_close_time;
        slider_title = configMap.slider_closed_title;
        toggle_text = '+';
        break;
      // bail for unknown position_type
      default:
        return false;
    }
    // animate slider position change
    stateMap.position_type = '';
    jqueryMap.$slider.animate(
      {height: height_px},
      animate_time,
      function () {
        jqueryMap.$toggle.prop('title', slider_title);
        jqueryMap.$toggle.text(toggle_text);
        stateMap.position_type = position_type;
        if (callback) {
          callback(jqueryMap.$slider);
        }
      });
    return true;
  };
  // End public DOM method /setSliderPosition/
  // --------------End DOM methods--------------

  // --------------Begin event handlers 私有的事件处理程序聚集在区块里面--------------
  onClickToggle = function (event) {
    var set_chat_anchor = configMap.set_chat_anchor;
    if (stateMap.position_type === 'opened') {
      set_chat_anchor('closed');
    } else if (stateMap.position_type === 'closed') {
      set_chat_anchor('opened');
    }
    return false;
  };
  // --------------End event handlers--------------

  // --------------Begin callback methods 回调函数聚集在区块里面--------------
  // --------------End callback methods--------------

  // --------------Begin public methods 公开方法聚集在区块里面，模块公开方法部分--------------
  // Begin public method / configModule /
  // Example : spa.chat.configModule({slider_open_em:18})
  // Purpose: Configure the module prior to initialization
  // Arguments:
  //  * set_chat_anchor - a callback to modify the URI anchor to indicate opened or closed state.
  //    This callback must return false if the requested state cannot be met
  //  * chat_model - the chat model object provides methods to interact with our instant messaging
  //  * people_model - the people model object which provides methods to manage the list of people the model maintains
  //  * slider_* settings. All these are optional scalars.
  //    See mapConfig.settable_map for a full list
  //    Example : slider_open_em is the open height in em's
  // Actions  :
  //    The internal configuration data structrue (configMap) is updated with provided arguments.No other actions are taken
  // Returns: true
  // Throws: JavaScript error object and stack trace on unacceptable or missing arguments
  configModule = function (input_map) {
    spa.util.setConfigMap({
      input_map: input_map,
      settable_map: configMap.settable_map,
      config_map: configMap
    });
    return true;
  };
  // End public method /configMoudle/

  // Begin public method /initModule/
  // Exampel :　spa.chat.initModule($('#div_id'));
  // Purpose : Directs Chat to offer its capability to the user
  // Arguments :
  //  * $append_target(example : $('#div_id'))
  //      A jQuery collection that should represent a single DOM container
  // Action :
  //  Appends the chat slider to the provided container and fills it with HTML content.
  //  It then initializes elements, events, and handlers to provide the user with a chat-room interface
  // Returns : true on success, false on failure
  // Throws : none
  initModule = function ($append_target) {
    $append_target.append(configMap.main_html);
    stateMap.$append_target = $append_target;
    setJqueryMap();
    setPxSizes();

    // initialize chat slider to default title and state
    jqueryMap.$toggle.prop('title', configMap.slider_closed_title);
    jqueryMap.$head.click(onClickToggle);
    stateMap.position_type = 'closed';
    return true;
  };
  // End public method /initModule/

  // return public methods
  return {
    setSliderPosition: setSliderPosition,
    configModule: configModule,
    initModule: initModule
  }
  // --------------End public methods--------------
}());
