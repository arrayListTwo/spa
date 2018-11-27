/**
 * spa.util_b.js
 * JavaScript browser utilities
 */
/*jslint         browser : true, continue : true,
        devel  : true, indent  : 2,    maxerr   : 50,
        newcap : true, nomen   : true, plusplus : true,
        regexp : true, sloppy  : true, vars     : true,
        white  : true
      */
/*global $, spa, getComputedStyle*/
spa.util_b = function () {
  `use strict`; // 使用严格模式的指令
  // -----------Begin module scope variables-----------------
  var
    configMap = {
      regex_encode_html: /[&"'><]/g,
      regex_encode_noamp: /["'><]/g,
      html_encode_map: {
        '&': '&#38;',
        '"': '&#34;',
        "'": '&#39;',
        '>': '&#62;',
        '<': '&#60;'
      }
    },
    decodeHtml, encodeHtml, getEmSize;
  /*创建一份修改后的配置的副本，用于编码实体，但要移除&符号*/
  configMap.encode_noamp_map = $.extend({}, configMap.html_encode_map);
  delete configMap.encode_noamp_map['&'];
  //-----------------End module scope variables

  //----------------Begin utility methods------------------
  // Begin decodeHtml
  // Decodes HTML entities in a browser-friendly way
  // See http://stackoverflow.com/questions/1912501/\
  // unescape-html-entities-in-javascript
  // 把浏览器实体($amp)转换成显示字符($)
  decodeHtml = function (str) {
    return $("<div/>").html(str || '').text();
  };
  // End decodeHtml

  // Begin encodeHtml
  // This is single pass encoder for html entities and handles
  // an arbitrary number of characters
  // 把特殊字符转换成HTML编码值
  encodeHtml = function (input_arg_str, exclude_amp) {
    var
      input_str = String(input_arg_str),
      regex, lookup_map;
    if (exclude_amp) {
      lookup_map = configMap.encode_noamp_map;
      regex = configMap.regex_encode_noamp;
    } else {
      lookup_map = configMap.html_encode_map;
      regex = configMap.regex_encode_html;
    }
    return input_str.replace(regex, function (match, name) {
      return lookup_map[match] || '';
    });
  };
  // End encodeHtml

  // Begin getEmSize
  // returns size of ems in pixels
  // 计算以em为单位的像素大小
  getEmSize = function (elem) {
    return Number(getComputedStyle(elem, '').fontSize.match(/\d*\.?\d*/)[0]);
  };
  // End getEmSize
  //----------------End utility methods-----------------
  // export methods 导出公开方法
  return {
    decodeHtml: decodeHtml,
    encodeHtml: encodeHtml,
    getEmSize: getEmSize
  };
}();