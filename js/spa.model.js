/*
 * spa.model.js
 * Model module
 */
/*jslint         browser : true, continue : true,
        devel  : true, indent  : 2,    maxerr   : 50,
        newcap : true, nomen   : true, plusplus : true,
        regexp : true, sloppy  : true, vars     : true,
        white  : true
      */
/*global $,spa*/
spa.model = (function () {
  'use strict';
  var
    configMap = {
      anon_id: 'a0' // 给匿名人员保留的特殊ID
    },
    stateMap = {
      // 在状态映射中保留anon_user键，用来保存匿名person对象
      anon_user: null,
      cid_serial: 0,
      // 用来保存pserson对象映射，键为客户端ID
      people_cid_map: {},
      // 保存person对象的TaffyDB集合，初始化为空集合
      people_db: TAFFY()
    },
    // 是否使用fake模块
    isFakeData = true,
    personProto, makeCid, clearPeopleDb, completeLogin,
    makePerson, removePerson, people, initModule;

  // The people object API
  // ----------------------
  // The people object is available at spa.model.people.
  // The people object provides methods and events to manage a collection of person objects.
  // Its public methods include:
  //  * get_user() - return the current user person object.
  //      if the current user is not signed-in, an anonymous person object is returned.
  //  * get_db() - return the TaffyDB database of all the person objects
  //    -including the current user - presorted.
  //  * get_by_cid(<client_id>) - return a person object with provided unique id.
  //  * login(<user_name>) - login as the user with the provided user name.
  //    The current user object is changed to reflect the new identity.
  //    Successful completion of login publishes a 'spa-login' global custom event.
  //  * logout() - revert the current user object to anonymous.
  //    This method publishes a 'spa-logout' global custom event.
  //
  // jQuery global custom events published by the object include:
  //  * spa-login - This is published when a user login process completes.
  //    The updated user object is provided as data.
  //  * spa-logout - This is published when a logout completes.
  //    The former user object is provided as data
  //
  // Each person is repersented by a person object.
  // Person objects provide the following methods:
  //  * get_is_user() - return true if object is the current user
  //  * get_is_anon() - return ture if object is anonymous
  //
  // The attributes for a person object include:
  //  * cid - string client id. This is always defined, and is only different from the id attribute
  //  * id - the unique id. This may be undefined if the object is not synced with the backend.
  //  * name - the string name of the user.
  //  * css_map - a map of attributes used for avatar presentation.
  //
  /**
   * 创建person对象的原型。
   * 使用原型通常能减少对内存的需求，从而改进对象的性能
   */
  personProto = {
    // 判断登入的是否是当前用户
    get_is_user: function () {
      return this.cid === stateMap.user.cid;
    },
    // 判断当前用户是否是匿名用户
    get_is_anon: function () {
      return this.cid === stateMap.anon_user.cid;
    }
  };
  /**
   * 客户端ID生成器
   * 通常person对象的客户端ID和服务器端ID是一样的；但是在客户端创建而还没有保存到后端的对象没有服务端ID
   */
  makeCid = function () {
    return 'c' + String(stateMap.cid_serial++);
  };

  /**
   * 移除所有除匿名人员之外的person对象；如果已有用户登入，则也要将当前用户除外
   */
  clearPeopleDb = function () {
    var user = stateMap.user;
    stateMap.people_db = TAFFY();
    stateMap.people_cid_map = {};
    if (user) {
      stateMap.people_db.insert(user);
      stateMap.people_cid_map[user.cid] = user;
    }
  };

  /**
   * 当后端发送回用户的确认信息和数据时，完成用户的登入。
   * 更新当前用户的信息；发布登入成功的spa-login事件
   */
  completeLogin = function (user_list) {
    var user_map = user_list[0];
    delete stateMap.people_cid_map[user_map.cid];
    stateMap.user.cid = user_map._id;
    stateMap.user.id = user_map._id;
    stateMap.user.css_map = user_map.css_map;
    stateMap.people_cid_map[user_map._id] = stateMap.user;
    // When we add chat, we should join here
    $.gevent.publish('spa-login', [stateMap.user]);
  };

  /**
   * 创建person对象
   * 新创建的对象保存到TaffyDB集合
   * 更新person_cid_map里面的索引
   * @param person_map
   */
  makePerson = function (person_map) {
    var person,
      cid = person_map.cid,
      css_map = person_map.css_map,
      id = person_map.id,
      name = person_map.name;
    if (cid === undefined || !name) {
      throw 'client id and name required';
    }
    person = Object.create(personProto);
    person.cid = cid;
    person.name = name;
    person.css_map = css_map;
    if (id) {
      person.id = id;
    }
    stateMap.people_cid_map[cid] = person;
    stateMap.people_db.insert(person);
    return person;
  };

  /**
   * 从人员列表中移除person对象
   */
  removePerson = function (person) {
    if (!person) {
      return false;
    }
    // can't remove anonymous person
    if (person.id === configMap.anon_id) {
      return false;
    }
    stateMap.people_db({cid: person.cid}).remove();
    if (person.cid) {
      delete stateMap.people_cid_map[person.cid];
    }
    return true;
  };

  /**
   * 定义people对象
   */
  people = {
    // 返回person对象的映射，键是客户端ID
    get_cid_map: function () {
      return stateMap.people_cid_map;
    }
  };

  people = (function () {
    var get_by_cid, get_db, get_user, login, logout;
    get_by_cid = function (cid) {
      return stateMap.people_cid_map[cid];
    };
    // 返回person对象的TaffyDB集合
    get_db = function () {
      return stateMap.people_db;
    };
    // 返回当前用户person对象
    get_user = function () {
      return stateMap.user;
    };
    login = function (name) {
      var sio = isFakeData ? spa.fake.mockSio : spa.data.getSio();
      stateMap.user = makePerson({
        cid: makeCid(),
        css_map: {top: 25, left: 25, 'background-color': '#8f8'},
        name: name
      });
      // 注册当后端发布了userupdate消息时，完成登入过程的回调函数
      sio.on('userupdate', completeLogin);
      // 向后端发送adduser消息，携带用户的详细信息
      sio.emit('adduser', {
        cid: stateMap.user.cid,
        css_map: stateMap.user.css_map,
        name: stateMap.user.name
      });
    };
    // 登出，发布spa-logout事件
    logout = function () {
      var is_removed, user = stateMap.user;
      // when we add chat, we should leave the chatroom here
      is_removed = removePerson(user);
      stateMap.user = stateMap.anon_user;
      $.gevent.publish('spa-logout', [user]);
      return is_removed;
    };
    return {
      get_by_cid: get_by_cid,
      get_db: get_db,
      get_user: get_user,
      login: login,
      logout: logout
    };
  }());
  initModule = function () {
    var i, people_list, person_map;
    // initialize anonymous person 初始化一个匿名用户
    stateMap.anon_user = makePerson({
      cid: configMap.anon_id,
      id: configMap.anon_id,
      name: 'anonymous'
    });
    stateMap.user = stateMap.anon_user;
    if (isFakeData) {
      people_list = spa.fake.getPeopleList();
      for (i = 0; i < people_list.length; i++) {
        person_map = people_list[i];
        makePerson({
          cid: person_map._id,
          css_map: person_map.css_map,
          id: person_map._id,
          name: person_map.name
        })
        ;
      }
    }
  };
  return {
    initModule: initModule,
    people: people
  };
}());