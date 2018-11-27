/*
module_template.js
Template for browser feature modules
 */
/*jslint         browser : true, continue : true,
        devel  : true, indent  : 2,    maxerr   : 50,
        newcap : true, nomen   : true, plusplus : true,
        regexp : true, sloppy  : true, vars     : true,
        white  : true
      */

/* global &,spa */
spa.module = (function () {
  // Begin module scope variables
  var
    config_Map = { // 保存模块配置
      settable_map: {color_name: true},
      color_name: 'blue'
    },
    stateMap = {$container: null}, // 保存运行时的状态值
    jqueryMap = {}, // 缓存jQuery集合
    setJqueryMap, configModule, initModule;
  // End module scope variables

  // --------------Begin utility methods 所有的私有工具方法聚集区块里面，这些方法不会操作DOM，不需要浏览器就能运行--------------
  // example: getTrimmedString
  // --------------End utility methods--------------

  // --------------Begin DOM methods 所有私有的DOM方法聚集在区块里面，访问和修改DOM，需要浏览器才能运行--------------
  // Begin DOM method / setJqueryMap /
  setJqueryMap = function () {
    var $container = stateMap.$container;
    jqueryMap = {$container: $container};
  };
  // End DOM method / setJqueryMap /
  // --------------End DOM methods--------------

  // --------------Begin event handlers 私有的事件处理程序聚集在区块里面--------------
  // example: onClickButton = ...
  // --------------End event handlers--------------

  // --------------Begin callback methods 回调函数聚集在区块里面--------------
  // --------------End callback methods--------------

  // --------------Begin public methods 公开方法聚集在区块里面，模块公开方法部分--------------
  // Begin public method / configModule /
  // Purpose: Adjust configuration of allowed keys
  // Arguments: a map of settable keys and values
  //  * color_name - color to use
  // Settings:
  //   * configMap.setable_map declares allowed keys
  // Returns : ture
  // Throws : none
  configModule = function (input_map) {
    spa.butil.setConfigMap({
      input_map: input_map,
      settable_map: configMap.settable_map,
      config_map: configMap
    });
    return true;
  };
  // End public method /configMoudle/

  // Begin public method /initModule/
  // Purpose: Initializes module
  // Arguments:
  // * $container the jquery element used by this feature
  // Returns: true
  // Throws: nonaccidental
  initModule = function ($container) {
    stateMap.$container = $container;
    setJqueryMap();
    return true;
  };
  // End public method /initModule/

  // return public methods
  return {
    configModule: configModule,
    initModule: initModule
  }
  // --------------End public methods--------------
}());
