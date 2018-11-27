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
  'use strict';
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
        + '     <div class="spa-chat-list">'
        + '       <div class="spa-chat-list-box"></div>'
        + '     </div>'
        + '     <div class="spa-chat-msg">'
        + '       <div class="spa-chat-msg-log"></div>'
        + '       <div class="spa-chat-msg-in">'
        + '         <form class="spa-chat-msg-form">'
        + '           <input type="text" />'
        + '           <input type="submit" style="display: none;" />'
        + '           <div class="spa-chat-msg-send">'
        + '             send'
        + '           </div>'
        + '         </form>'
        + '       </div>'
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
      slider_opened_em: 18,
      slider_closed_em: 2,
      slider_opened_min_em: 10,
      window_height_min_em: 20,
      slider_opened_title: 'Tap to close',
      slider_closed_title: 'Tap to open',

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
    setJqueryMap, /*getEmSize, */setPxSizes, scrollChat,
    writeChat, writeAlert, clearChat,
    setSliderPosition,
    onTapToggle, onSubmitMsg, onTapList,
    onSetchatee, onUpdatechat, onListchange,
    onLogin, onLogout,
    configModule, initModule, removeSlider, handleResize;
  // End module scope variables

  // --------------Begin utility methods 所有的私有工具方法聚集区块里面，这些方法不会操作DOM，不需要浏览器就能运行--------------
  /*将em显示单位转换为像素*/
  /* 和浏览器有关，函数移至：spa.util.b.js */
  /*getEmSize = function (elem) {
    return Number(getComputedStyle(elem, '').fontSize.match(/\d*\.?\d*!/)[0]);
  };*/
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
      $list_box: $slider.find('.spa-chat-list-box'),
      $msg_log: $slider.find('.spa-chat-msg-log'),
      $msg_in: $slider.find('.spa-chat-msg-in'),
      $input: $slider.find('.spa-chat-msg-in input[type=text]'),
      $send: $slider.find('.spa-chat-msg-send'),
      $form: $slider.find('.spa-chat-msg-form'),
      $window: $(window)
    };
  };
  // End DOM method / setJqueryMap /

  // Begin DOM method /setJqueryMap/
  /*计算由该模块管理的元素的尺寸*/
  setPxSizes = function () {
    var px_per_em, window_height_em, opened_height_em;
    // 使用浏览器端工具方法集方法
    px_per_em = spa.util_b.getEmSize(jqueryMap.$slider.get(0));
    // 计算窗口的高度，单位为em
    window_height_em = Math.floor((jqueryMap.$window.height() / px_per_em) + 0.5);
    // 当窗口高度小于阈值，滑块设置为最小高度
    // 窗口高度大于/等于阈值，滑块设置为正常高度
    opened_height_em
      = window_height_em > configMap.window_height_min_em
      ? configMap.slider_opened_em
      : configMap.slider_opened_min_em;
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
    // position type of 'opened' s not allowed for anon user;
    // therefore we simple return false; the shell will fix the uri and try again
    // 如果用户是匿名的，则阻止打开滑块。Shell的回调函数会相应的修改URI
    if (position_type === 'opened'
      && configMap.people_model.get_user().get_is_anon()) {
      // 未完成滑块展开
      return false;
    }
    // return true if slider already in requested position
    // TODO 避免竞争
    if (stateMap.position_type === position_type) {
      // 当滑块展开的时候，输入框获取焦点
      if (position_type === 'opened') {
        jqueryMap.$input.focus();
      }
      return true;
    }
    // prepare animation parameters
    switch (position_type) {
      case 'opened':
        height_px = stateMap.slider_opened_px;
        animate_time = configMap.slider_open_time;
        slider_title = configMap.slider_opened_title;
        toggle_text = '=';
        // 滑块展开，则输入框获取到焦点
        jqueryMap.$input.focus();
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
  // Begin private DOM methods to message chat message 用于操作消息记录的所有DOM方法的区块
  // 消息记录文字以平滑滚动的方式显现
  scrollChat = function () {
    var $msg_log = jqueryMap.$msg_log;
    $msg_log.animate({
      // 移动消息记录框至最下方
      scrollTop: $msg_log.prop('scrollHeight') - $msg_log.height()
    }, 150);
  };
  // 添加消息记录。如果发送者是用户自己，则使用不同的样式。请务必在输出HTMl的时候进行编码
  writeChat = function (person_name, text, is_user) {
    var msg_class = is_user ? 'spa-chat-msg-log-me' : 'spa-chat-msg-log-msg';
    jqueryMap.$msg_log.append(
      '<div class = "' + msg_class + '">'
      + spa.util_b.encodeHtml(person_name) + ': '
      + spa.util_b.encodeHtml(text) + '</div>'
    );
    // 移动消息记录至最下方
    scrollChat();
  };
  // 在消息记录中添加系统警告。务必在输出HTMl时进行编码
  writeAlert = function (alert_text) {
    jqueryMap.$msg_log.append(
      '<div class = "spa-chat-msg-log-alert">'
      + spa.util_b.encodeHtml(alert_text)
      + '</div>'
    );
    scrollChat();
  };
  // 清除消息记录
  clearChat = function () {
    jqueryMap.$msg_log.empty();
  };
  // End private DOM methods to manage chat message
  // --------------End DOM methods--------------

  // --------------Begin event handlers 私有的事件处理程序聚集在区块里面--------------
  onTapToggle = function (event) {
    var set_chat_anchor = configMap.set_chat_anchor;
    if (stateMap.position_type === 'opened') {
      set_chat_anchor('closed');
    } else if (stateMap.position_type === 'closed') {
      set_chat_anchor('opened');
    }
    return false;
  };
  // 当用户提交发送消息时，触发事件。使用model.chat.send_msg方法来发送消息
  onSubmitMsg = function (event) {
    var msg_text = jqueryMap.$input.val();
    if (msg_text.trim() === '') {
      return false;
    }
    configMap.chat_model.send_msg(msg_text);
    jqueryMap.$input.focus();
    jqueryMap.$send.addClass('spa-x-select');
    setTimeout(function () {
      jqueryMap.$send.removeClass('spa-x-select');
    }, 250);
    return false;
  };
  // 当用户点击或者轻击(tap)用户名时，产生此事件。使用model.chat.set_chatee方法来设置听者
  onTapList = function (event) {
    var $tapped = $(event.elem_target), chatee_id;
    if (!$tapped.hasClass('spa-chat-list-name')) {
      return false;
    }
    chatee_id = $tapped.attr('data-id');
    if (!chatee_id) {
      return false;
    }
    configMap.chat_model.set_chatee(chatee_id);
    return false;
  };
  // 为model发布的spa-setchatee事件创建onSetchatee事件处理程序。
  // 该处理程序会选择新的听者并取消选择旧的听者
  // 它也会更新滑块标题，并通知用户听者已经改变了
  onSetchatee = function (event, arg_map) {
    var
      new_chatee = arg_map.new_chatee,
      old_chatee = arg_map.old_chatee;
    jqueryMap.$input.focus();
    if (!new_chatee) {
      if (old_chatee) {
        writeAlert(old_chatee.name + ' has left the chat');
      } else {
        writeAlert('Your friend has left the chat');
      }
      jqueryMap.$title.text('chat');
      return false;
    }
    jqueryMap.$list_box
      .find('.spa-chat-list-name')
      .removeClass('spa-x-select')
      .end()
      .find('[data-id=' + arg_map.new_chatee.id + ']')
      .addClass('spa-x-select');
    writeAlert('Now chatting with ' + arg_map.new_chatee.name);
    jqueryMap.$title.text('Chat with ' + arg_map.new_chatee.name);
    return true;
  };

  // 该处理程序会获取当前人员集合，并渲染人员列表，如果有听者的话，则确保高亮听者
  onListchange = function (evnet) {
    var
      list_html = String(),
      people_db = configMap.people_model.get_db(),
      chatee = configMap.chat_model.get_chatee();
    people_db().each(function (person, idx) {
      var select_class = '';
      if (person.get_is_anon() || person.get_is_user()) {
        return true;
      }
      if (chatee && chatee.id === person.id) {
        select_class = ' spa-x-select';
      }
      list_html += '<div class="spa-chat-list-name'
        + select_class + '" data-id="' + person.id + '">'
        + spa.util_b.encodeHtml(person.name) + '</div>';
    });
    if (!list_html) {
      list_html = String()
        + '<div class="spa-chat-list-note">'
        + 'To chat alone is the fate of all great souls...<br><br>'
        + 'No one is online'
        + '</div>';
      clearChat();
    }
    jqueryMap.$list_box.html(list_html);
  };
  //
  onUpdatechat = function (event, msg_map) {
    var
      is_user,
      sender_id = msg_map.sender_id,
      msg_text = msg_map.msg_text,
      chatee = configMap.chat_model.get_chatee() || {},
      sender = configMap.people_model.get_by_cid(sender_id);
    if (!sender) {
      writeAlert(msg_text);
      return false;
    }
    is_user = sender.get_is_user();
    if (!(is_user || sender_id === chatee.id)) {
      configMap.chat_model.set_chatee(sender_id);
    }
    writeChat(sender.name, msg_text, is_user);
    if (is_user) {
      jqueryMap.$input.val('');
      jqueryMap.$input.focus();
    }
  };
  //
  onLogin = function (event, login_user) {
    configMap.set_chat_anchor('opened');
  };
  //
  onLogout = function () {
    configMap.set_chat_anchor('closed');
    jqueryMap.$title.text('Chat');
    clearChat();
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
    var $list_box;
    // 将chat模块添加到shell容器里面
    stateMap.$append_target = $append_target;
    $append_target.append(configMap.main_html);
    setJqueryMap();
    setPxSizes();

    // 订阅model发布的所有事件
    // Hava $list_box subscribe to jQuery global events
    $list_box = jqueryMap.$list_box;
    $.gevent.subscribe($list_box, 'spa-listchange', onListchange);
    $.gevent.subscribe($list_box, 'spa-setchatee', onSetchatee);
    $.gevent.subscribe($list_box, 'spa-updatechat', onUpdatechat);
    $.gevent.subscribe($list_box, 'spa-login', onLogin);
    $.gevent.subscribe($list_box, 'spa-logout', onLogout);
    // bind user input event
    // 绑定所有的用户输入事件
    // 如果在订阅之前绑定，则会产生竞争条件 ?
    jqueryMap.$head.bind('utap', onTapToggle);
    jqueryMap.$list_box.bind('utap', onTapList);
    jqueryMap.$send.bind('utap', onSubmitMsg);
    jqueryMap.$form.bind('submit', onSubmitMsg);

    // initialize chat slider to default title and state
    jqueryMap.$toggle.prop('title', configMap.slider_closed_title);
    jqueryMap.$head.click(onTapToggle);
    stateMap.position_type = 'closed';
    return true;
  };
  // End public method /initModule/

  // Begin public method /removeSlider/
  // Purpose:
  //  * Removes chatSlider DOM element
  //  * Reverts to initial state
  //  * Removes pointers to callbacks and other data
  // Arguments : none
  // Returns: true
  // Thorws: none
  removeSlider = function () {
    // unwind initialization and state
    // remove DOM container; this removes event bindings too
    if (jqueryMap.$slider) {
      jqueryMap.$slider.remove();
      jqueryMap = {};
    }
    stateMap.$append_target = null;
    stateMap.position_type = 'closed';

    // unwind key configurations
    configMap.chat_model = null;
    configMap.people_model = null;
    configMap.set_chat_anchor = null;
    return true;
  };
  // End public method /removeSlider/

  // Begin public method /handleResize/
  // Purpose:
  //  Given a window resize event, adjust the presentation provided by this module if needed
  // Actions:
  // If the window height or width falls below
  // a given threshold resize the chat slider for the
  // reduced window size.
  // Returns: Boolean
  //  * false - resize not considered
  //  * true - resize considered
  // Throws: none
  handleResize = function () {
    // don't do anything if we don't have a slider container
    if (!jqueryMap.$slider) {
      return false
    }
    // 重新计算像素尺寸
    setPxSizes();
    if (stateMap.position_type === 'opened') {
      jqueryMap.$slider.css({height: stateMap.slider_opened_px});
    }
    return true;
  };
  // End public method /handleResize/

  // return public methods
  return {
    setSliderPosition: setSliderPosition,
    configModule: configModule,
    initModule: initModule,
    removeSlider: removeSlider,
    handleResize: handleResize
  }
  // --------------End public methods--------------
}());
