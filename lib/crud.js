/**
 * crud.js - modele to provide CRUD db capabilities
 */
/*jslint         browser : true, continue : true,
        devel  : true, indent  : 2,    maxerr   : 50,
        newcap : true, nomen   : true, plusplus : true,
        regexp : true, sloppy  : true, vars     : true,
        white  : true
      */
/*global */
// -----Begin module scope variables --------------
'use strict';
var
  loadSchema, checkSchema, clearIsOnline,
  checkType, constructObj, readObj,
  updateObj, destroyObj,
  mongodb = require('mongodb'),
  fsHandle = require('fs'),
  JSV = require('JSV').JSV,
  mongoServer = new mongodb.Server('localhost', mongodb.Connection.DEFAULT_PORT),
  dbHandle = new mongodb.Db('spa', mongoServer, {safe: true}),
  // 创建JSV验证环境
  validator = JSV.createEnvironment(),
  makeMongoId = mongodb.ObjectID,
  objTypemap = {'user': {}};
// -----End module scope variables --------------
// ----- Begin Utility methods ------
/**
 * 创建工具方法，读取文件内容并把它保存到对象类型映射
 * @param schema_name
 * @param schema_path
 */
loadSchema = function (schema_name, schema_path) {
  fsHandle.readFile(schema_path, 'utf-8', function (err, data) {
    if (err) {
      console.log('json document is error.');
    }
    objTypemap[schema_name] = JSON.parse(data);
  });
};
/**
 * 验证
 * @param obj_type 要验证的对象schema名称
 * @param obj_map 需验证的对象
 * @param callback 回调函数
 */
checkSchema = function (obj_type, obj_map, callback) {
  var
    schema_map = objTypemap[obj_type],
    report_map = validator.validate(obj_map, schema_map);
  // 调用回调函数，参数是错误列表；若错误列表为空，则表示对象是有效
  callback(report_map.errors);
};
/**
 * 所有的user标记为离线
 */
clearIsOnline = function () {
  updateObj(
    'user',
    {is_online: true},
    {is_online: false},
    function (response_map) {
      console.log('All users set too offline', response_map);
    });
};
// ----- End Utility methods -----
// ----- Begin public methods -----------
/**
 * 检查对象类型是否为模块支持
 * @param obj_type
 * @returns {{error_msg: string}}
 */
checkType = function (obj_type) {
  if (!objTypemap[obj_type]) {
    return ({error_msg: 'Object type "' + obj_type + '" is not supported.'});
  }
};
constructObj = function (obj_type, obj_map, callback) {
  var type_check_map = checkType(obj_type);
  if (type_check_map) {
    callback(type_check_map);
    return;
  }
  checkSchema(
    obj_type, obj_map,
    function (error_list) {
      if (error_list.length === 0) {
        dbHandle.collection(
          obj_type,
          function (outer_error, collection) {
            var options_map = {safe: true};
            collection.insert(
              obj_map,
              options_map,
              function (inner_error, result_map) {
                callback(result_map);
              }
            );
          });
      } else {
        callback({
          error_msg: 'Input document not valid',
          error_list: error_list
        });
      }
    }
  );
};
readObj = function (obj_type, find_map, fields_map, callback) {
  var type_check_map = checkType(obj_type);
  if (type_check_map) {
    callback(type_check_map);
    return;
  }
  dbHandle.collection(
    obj_type,
    function (outer_error, collection) {
      collection.find(find_map, fields_map).toArray(function (inner_error, map_list) {
        callback(map_list);
      });
    });
};
updateObj = function (obj_type, find_map, set_map, callback) {
  var type_check_map = checkType(obj_type);
  if (type_check_map) {
    callback(type_check_map);
    return;
  }
  checkSchema(obj_type, set_map, function (error_list) {
    if (error_list.length === 0) {
      dbHandle.collection(
        obj_type,
        function (outer_error, collection) {
          collection.update(
            find_map,
            {$set: set_map},
            {safe: true, multi: true, upsert: false},
            function (inner_error, update_count) {
              callback({update_count: update_count});
            }
          );
        }
      );
    } else {
      callback({
        error_msg: 'Input document not valid',
        error_list: error_list
      });
    }
  });
};
destroyObj = function (obj_type, find_map, callback) {
  var type_check_map = checkType(obj_type);
  if (type_check_map) {
    callback(type_check_map);
    return;
  }
  dbHandle.collection(
    obj_type,
    function (outer_error, collection) {
      var options_map = {safe: true, single: true};
      collection.remove(
        find_map,
        options_map,
        function (inner_error, delete_count) {
          callback({delete_count: delete_count});
        }
      );
    }
  );
};
module.exports = {
  makeMongoId: mongodb.ObjectID,
  checkType: checkType,
  construct: constructObj,
  read: readObj,
  update: updateObj,
  destroy: destroyObj
};
// ----- End public methods -----------
// ---------- Begin module initialization ------------------
dbHandle.open(function () {
  console.log('** Connected to MongoDB **');
  clearIsOnline();
});
// load schema into memory (objTypeMap)
(function () {
  var schema_name, schema_path;
  for (schema_name in objTypemap) {
    if (objTypemap.hasOwnProperty(schema_name)) {
      schema_path = __dirname + "/" + schema_name + ".json";
      loadSchema(schema_name, schema_path);
    }
  }
}());
// ---------- End module initialization ------------------