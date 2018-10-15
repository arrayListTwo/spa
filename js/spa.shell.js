
/*
 * spa.shell.js
 * Shell module for SPA
 */
/*jslint         browser : true, continue : true,
        devel  : true, indent  : 2,    maxerr   : 50,
        newcap : true, nomen   : true, plusplus : true,
        regexp : true, sloppy  : true, vars     : false,
        white  : true
*/
/*global $,spa*/
spa.shell = (function () {
  //---------------- BEGIN MODULE SCOPE VARIABLES --------------
  var
    configMap = { // 静态配置值
      anchor_schema_map: {
      	
        chat  : {open: true,closed: true}
      },
      main_html: String()
        + '<!--LOGO 账户设置 搜索框-->'
        + '    <div class="spa-shell-head">'
        + '        <div class="spa-shell-head-logo"></div>'
        + '        <div class="spa-shell-head-acct"></div>'
        + '        <div class="spa-shell-head-search"></div>'
        + '    </div>'
        + '    <!--主容器：导航 content容器-->'
        + '    <div class="spa-shell-main">'
        + '        <div class="spa-shell-main-nav"></div>'
        + '        <div class="spa-shell-main-content"></div>'
        + '    </div>'
        + '    <!--footer容器-->'
        + '    <div class="spa-shell-foot"></div>'
        + '    <!--chat容器-->'
        + '    <div class="spa-shell-chat"></div>'
        + '    <!--modal容器-->'
        + '    <div class="spa-shell-modal"></div>',
      chat_extend_time: 1000,
      chat_retract_time: 300,
      chat_extend_height: 450,
      chat_retract_height: 15,
      chat_extended_title: 'Click to retract',
      chat_retracted_title: 'Click to extend'
    },
    stateMap = {// 共享的动态信息
      $container: null,
      anchor_map: {}, // 将当前锚的值保存在表示模块状态的映射中
      is_chat_retracted: true
    },
    jqueryMap = {}, // jQuery缓存
    copyAnchorMap, setJqueryMap, toggleChat,
    changeAnchorPart, onHashchange,
    onClickChat, initModule;

  // --------------Begin utility methods 所有的私有工具方法聚集区块里面，这些方法不会操作DOM，不需要浏览器就能运行--------------
  // Returns copy of stored anchor map; minamizes overhead
  copyAnchorMap = function () {
    return $.extend(true, {}, stateMap.anchor_map);
  };
  // --------------End utility methods--------------

  // --------------Begin DOM methods 所有私有的DOM方法聚集在区块里面，访问和修改DOM，需要浏览器才能运行--------------
  // Begin DOM method / setJqueryMap /
  setJqueryMap = function () {
    var $container = stateMap.$container;
    jqueryMap = {
      $container: $container, // 页面容器缓存
      $chat: $container.find('.spa-shell-chat') // 将聊天滑块的jQuery集合缓存
    };
  };
  // End DOM method / setJqueryMap /
  // Begin DOM method /toggleChat/
  // Purpose : Extends or retracts chat slider
  // Arguments:
  // * do_extend - if true, extends slider; if false retracts
  // * callback - optional function to execute at end of animation
  // Settings :
  // * chat_extend_time, chat_retract_time
  // * chat_extend_height, chat_retract_height
  // State : sets stateMap.is_chat_retracted
  // * true - slider is retracted
  // * false - slider is extended
  // Returns : boolean
  // * true - slider animation activated
  // * false - slider animation not activated
  toggleChat = function (do_extend, callback) {
    var
      px_chat_ht = jqueryMap.$chat.height(),
      is_open = px_chat_ht === configMap.chat_extend_height,
      is_closed = px_chat_ht === configMap.chat_retract_height,
      is_sliding = !is_open && !is_closed;
    // avoid race condition
    if (is_sliding) { // 避免出现竞争条件
      return false;
    }
    // Begin extend chat slider
    if (do_extend) {
      jqueryMap.$chat.animate(
        {height: configMap.chat_extend_height},
        configMap.chat_extend_time,
        function () {
          jqueryMap.$chat.attr(
            'title', configMap.chat_extended_title
          );
          stateMap.is_chat_retracted = false;
          if (callback) {
            callback(jqueryMap.$chat);
          }
        });
      return true;
    }
    // End extend chat slider

    // Begin retract chat slider
    jqueryMap.$chat.animate(
      {height: configMap.chat_retract_height},
      configMap.chat_retract_time,
      function () {
        jqueryMap.$chat.attr(
          'title', configMap.chat_retracted_title
        );
        stateMap.is_chat_retracted = true;
        if (callback) {
          callback(jqueryMap.$chat);
        }
      }
    );
    return true;
    // End retract chat slider
  };
  // Begin DOM method /changeAnchorPart/
  // Purpose : change part of the URI anchor compoent
  // Arguments:
  // * arg_map - The map describing what part of the URI anchor we want changed
  // Return :　boolean
  // * true - the Anchor porting of the URI was update
  // * false - the Anchor portion of the URI could not be updated
  // Action:
  // The current anchor rep stored in stateMap_anchor_map
  // See uriAnchor for a discussion of encoding.
  // This method
  // * Creates a copy of this map using copyAnchorMap().
  // * Modified the key-values using arg_map
  // * Manages the distinction between independent and dependent values in the encoding
  // * Attempts to change URI using uriAnchor
  // * Returns true on success, and false on failure
  changeAnchorPart = function (arg_map) {
    var
      anchor_map_revise = copyAnchorMap(),
      bool_return = true,
      key_name, key_name_dep;
    // Begin merge changes into anchor map
    KEYVAL:
      for (key_name in arg_map) {
        if (arg_map.hasOwnProperty(key_name)) {
          // skip dependent keys during iteration
          if (key_name.indexOf('_') === 0) {
            continue KEYVAL;
          }
          // update independend key value
          anchor_map_revise[key_name] = arg_map[key_name];
          // update matching dependent key
          key_name_dep = '_' + key_name;
          if (arg_map[key_name_dep]) {
            anchor_map_revise[key_name_dep] = arg_map[key_name_dep];
          } else {
            delete anchor_map_revise[key_name_dep];
            delete anchor_map_revise['_s' + key_name_dep];
          }
        }
      }
    // End merge changes into anchor map

    // Begin attempt to URI; revert if not successful
    try {
      $.uriAnchor.setAnchor(anchor_map_revise);
    } catch (error) {
      // replace URI with existing state
      $.uriAnchor.setAnchor(stateMap.anchor_map, null, true);
      bool_return = false;
    }
    // End attempt to update URI...
    return bool_return;
  };
  // --------------End DOM methods--------------

  // --------------Begin event handlers 私有的事件处理程序聚集在区块里面--------------
  // Begin Event handler /onHashchange/
  // Purpose : Handles the hashchange event
  // Arguments:
  // * event - jQuery event object.
  // Settings : none
  // Returns : false
  // Actions :
  // * Parses the URI anchor component
  // * Compares proposed application state with current
  // * Adjust the application only where proposed state differs for existing
  onHashchange = function (event) {
    var
      anchor_map_previous = copyAnchorMap(),
      anchor_map_proposed,
      _s_chat_previous, _s_chat_proposed,
      s_chat_proposed;
    // sttempt to parse anchor
    try {
      anchor_map_proposed = $.uriAnchor.makeAnchorMap();
    } catch (error) {
      $.uriAnchor.setAnchor(anchor_map_previous, null, true);
      return false;
    }
    stateMap.anchor_map = anchor_map_proposed;
    // convenience vars
    _s_chat_previous = anchor_map_previous._s_chat;
    _s_chat_proposed = anchor_map_proposed._s_chat;
    // Begin adjust chat compontent if changed
    if (!anchor_map_previous || _s_chat_previous !== _s_chat_proposed) {
      s_chat_proposed = anchor_map_proposed.chat;
      switch (s_chat_proposed) {
        case 'open':
          toggleChat(true);
          break;
        case 'closed':
          toggleChat(false);
          break;
        default:
            toggleChat(false);
            delete anchor_map_proposed.chat;
            $.uriAnchor.setAnchor(anchor_map_proposed, null, true);
      }
    }
    // End adjust chat component if changed
    return false;
  };
  // End Event handler /onHashchange/
  // Begin Event handler /onClickChat/
  onClickChat = function ( event ) {
    /*if (toggleChat(stateMap.is_chat_retracted)) {
      // 改变URI
      $.uriAnchor.setAnchor({
        chat: (stateMap.is_chat_retracted ? 'open' : 'close')
      });
    }*/
    changeAnchorPart({
      chat: (stateMap.is_chat_retracted ? 'open' : 'closed')
    });
    return false;
  };
  // --------------End event handlers--------------

  // --------------Begin public methods 公开方法聚集在区块里面，模块公开方法部分--------------
  // Begin public method /initModule/
  initModule = function ($container) {
    // load HTML and map jQuery collections
    stateMap.$container = $container;
    $container.html(configMap.main_html);
    setJqueryMap();
    // initialize chat slider and bind click handler
    stateMap.is_chat_retracted = true;
    jqueryMap.$chat
      .attr('title', configMap.chat_retracted_title)
      .click(onClickChat);
    // configure uriAnchor to use our schema
    $.uriAnchor.configModule({
      schema_map: configMap.anchor_schema_map
    });
    // Handle URI anchor change events
    // This is done /after/ all feature modules are configured
    // and initialized, otherwise they will not be ready to handle
    // the trigger event, which is used to ensure the anchor
    // is considered on-load
    // 绑定hashchange事件处理程序并立即触发它，这样模块在初始加载时就会处理书签
    $(window)
    	.bind('hashchange', onHashchange)
    	.trigger('hashchange');
  };   
  // End public method /initModule/

  // return public methods
  return {
    initModule: initModule
  };
  // --------------End public methods--------------
}());