/*
 * spa.avtr.js
 * Avatar feature module
 */
/*jslint         browser : true, continue : true,
        devel  : true, indent  : 2,    maxerr   : 50,
        newcap : true, nomen   : true, plusplus : true,
        regexp : true, sloppy  : true, vars     : true,
        white  : true
      */

/* global $,spa */
spa.avtr = (function () {
  'use strict';
  // Begin module scope variables
  var
    configMap = { // 保存模块配置
      settable_map: { // 存储chat模块所有的设置
        chat_model: true,
        people_model: true,
      },
      chat_model: null,
      people_model: null,
    },
    stateMap = {  // 保存运行时的状态值
      drag_map: null,
      $drag_target: null,
      drag_bg_color: undefined
    },
    jqueryMap = {}, // 缓存jQuery集合
    getRandRgb,
    setJqueryMap, updateAvatar,
    onTapNav, onHeldstartNav,
    onHeldmoveNav, onHeldendNav,
    onSetchatee, onListchange,
    onLogout,
    configModule, initModule;
  // End module scope variables

  // --------------Begin utility methods 所有的私有工具方法聚集区块里面，这些方法不会操作DOM，不需要浏览器就能运行--------------
  // 生成随机的RGB颜色字符串
  getRandRgb = function () {
    var i, rgb_list = [];
    for (i = 0; i < 3; i++) {
      rgb_list.push(Math.floor(Math.random() * 128) + 128);
    }
    return 'rgb(' + rgb_list.join(',') + ')';
  };
  // --------------End utility methods--------------

  // --------------Begin DOM methods 所有私有的DOM方法聚集在区块里面，访问和修改DOM，需要浏览器才能运行--------------
  // Begin DOM method / setJqueryMap /
  setJqueryMap = function ($container) {
    jqueryMap = {
      $container: $container
    };
  };
  // End DOM method / setJqueryMap /
  // 读取头像$target中的css值，然后调用model.chat.update_avatar方法
  updateAvatar = function ($target) {
    var css_map, person_id;
    css_map = {
      top: parseInt($target.css('top'), 10),
      left: parseInt($target.css('left'), 10),
      'background-color': $target.css('background-color')
    };
    person_id = $target.attr('data-id');
    configMap.chat_model.update_avatar({
      person_id: person_id,
      css_map: css_map
    });
  };
  // --------------End DOM methods-----------------

  // --------------End event handlers--------------

  // 创建onTapNav事件处理程序，当用户点击或者轻击导航区域时，会触发这个事件
  // 该处理程序使用了事件委托(event delegate)，如果轻击的元素在头像的下面，则做出响应的反应。否则忽略该事件
  onTapNav = function (event) {
    var css_map,
      $target = $(event.elem_target).closest('.spa-avtr-box');
    if ($target.length === 0) {
      return false;
    }
    $target.css({'background-color': getRandRgb});
    updateAvatar($target);
  };

  // 在用户在导航区域拖动时，触发事件
  onHeldstartNav = function (event) {
    var offset_target_map, offset_nav_map,
      $target = $(event.elem_target).closest('.spa-avtr-box');
    if ($target.length === 0) {
      return false;
    }
    stateMap.$drag_target = $target;
    offset_target_map = $target.offset();
    offset_nav_map = jqueryMap.$container.offset();

    offset_target_map.top -= offset_nav_map.top;
    offset_target_map.left -= offset_nav_map.left;

    stateMap.drag_map = offset_target_map;
    stateMap.drag_bg_color = $target.css('background-color');

    $target
      .addClass('spa-x-is-drag')
      .css('background-color', '');
  };

  // 在用户拖动头像的过程中，会触发这个事件。这个方法会频繁的执行，所以要把计算量保持在最小限度
  onHeldmoveNav = function (event) {
    var drag_map = stateMap.drag_map;
    if (!drag_map) {
      return false;
    }
    drag_map.top += event.px_delta_y;
    drag_map.left += event.px_delta_x;

    stateMap.$drag_target.css({
      top: drag_map.top,
      left: drag_map.left
    });
  };

  // 在用户拖动头像释放时，触发这个事件。该处理程序会把拖动的头像恢复为它的初始颜色。
  // 然后，调用updateAvatar方法，读取头像的详细信息并调用model.chat.update_avatar方法
  onHeldendNav = function () {
    var $drag_target = stateMap.$drag_target;
    if (!$drag_target) {
      return false;
    }
    $drag_target
      .removeClass('spa-x-is-drag')
      .css('background-color', stateMap.drag_bg_color);
    stateMap.drag_bg_color = undefined;
    stateMap.$drag_target = null;
    stateMap.drag_map = null;
    updateAvatar($drag_target);
  };

  // 听者头像的轮廓设置为绿色
  onSetchatee = function (event, arg_map) {
    var
      $nav = $(this),
      new_chatee = arg_map.new_chatee,
      old_chatee = arg_map.old_chatee;

    // Use this to highlight avatar of user in nav area
    // See new_chatee.name, old_chatee.name, etc.

    // remove highlight from old_chatee avatar here
    if (old_chatee) {
      $nav
        .find('.spa-avtr-box[data-id=' + old_chatee.cid + ']')
        .removeClass('spa-x-is-chatee');
    }
    // add highlight to new_chatee avatar here
    if (new_chatee) {
      $nav
        .find('.spa-avtr-box[data-id=' + new_chatee.cid + ']')
        .addClass('spa-x-is-chatee');
    }
  };

  // 重绘头像
  onListchange = function (evnet) {
    var
      $nav = $(this),
      people_db = configMap.people_model.get_db(),
      user = configMap.people_model.get_user(),
      chatee = configMap.chat_model.get_chatee() || {},
      $box;
    $nav.empty();
    // if the user is logged out, do not render
    if (user.get_is_anon()) {
      return false;
    }
    people_db().each(function (person, idx) {
      var class_list;
      if (person.get_is_anon()) {
        return true;
      }
      class_list = ['spa-avtr-box'];
      if (chatee.id === person.id) {
        class_list.push('spa-x-is-chatee');
      }
      if (person.get_is_user()) {
        class_list.push('spa-x-is-user');
      }
      $box = $('<div/>')
        .addClass(class_list.join(' '))
        .css(person.css_map)
        .attr('data-id', String(person.id))
        .prop('title', spa.util_b.encodeHtml(person.name))
        .text(person.name)
        .appendTo($nav);
    });
  };
  //移除所有头像
  onLogout = function () {
    jqueryMap.$container.empty();
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
  initModule = function ($container) {
    setJqueryMap($container);
    // 绑定model发布的事件
    $.gevent.subscribe($container, 'spa-setchatee', onSetchatee);
    $.gevent.subscribe($container, 'spa-listchange', onListchange);
    $.gevent.subscribe($container, 'spa-logout', onLogout);
    // bind user input event
    // 绑定所有的用户输入事件
    // 如果在订阅之前绑定，则会产生竞争条件
    $container
      .bind('utap', onTapNav)
      .bind('uheldstart', onHeldstartNav)
      .bind('uheldmove', onHeldmoveNav)
      .bind('uheldend', onHeldendNav);
    return true;
  };
  // End public method /initModule/
  // End public method /handleResize/

  // return public methods
  return {
    configModule: configModule,
    initModule: initModule,
  }
  // --------------End public methods--------------
}());
