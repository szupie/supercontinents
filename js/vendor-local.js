var xhtml = "http://www.w3.org/1999/xhtml";
var namespaces = {
  svg: "http://www.w3.org/2000/svg",
  xhtml,
  xlink: "http://www.w3.org/1999/xlink",
  xml: "http://www.w3.org/XML/1998/namespace",
  xmlns: "http://www.w3.org/2000/xmlns/"
};
function namespace(name) {
  var prefix = name += "",i = prefix.indexOf(":");
  if (i >= 0 && (prefix = name.slice(0, i)) !== "xmlns")
  name = name.slice(i + 1);
  return namespaces.hasOwnProperty(prefix) ? { space: namespaces[prefix], local: name } : name;
}
function creatorInherit(name) {
  return function () {
    var document2 = this.ownerDocument,uri = this.namespaceURI;
    return uri === xhtml && document2.documentElement.namespaceURI === xhtml ? document2.createElement(name) : document2.createElementNS(uri, name);
  };
}
function creatorFixed(fullname) {
  return function () {
    return this.ownerDocument.createElementNS(fullname.space, fullname.local);
  };
}
function creator(name) {
  var fullname = namespace(name);
  return (fullname.local ? creatorFixed : creatorInherit)(fullname);
}
function none() {
}
function selector(selector2) {
  return selector2 == null ? none : function () {
    return this.querySelector(selector2);
  };
}
function selection_select(select2) {
  if (typeof select2 !== "function")
  select2 = selector(select2);
  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
      if ((node = group[i]) && (subnode = select2.call(node, node.__data__, i, group))) {
        if ("__data__" in node)
        subnode.__data__ = node.__data__;
        subgroup[i] = subnode;
      }
    }
  }
  return new Selection(subgroups, this._parents);
}
function array(x) {
  return x == null ? [] : Array.isArray(x) ? x : Array.from(x);
}
function empty() {
  return [];
}
function selectorAll(selector2) {
  return selector2 == null ? empty : function () {
    return this.querySelectorAll(selector2);
  };
}
function arrayAll(select2) {
  return function () {
    return array(select2.apply(this, arguments));
  };
}
function selection_selectAll(select2) {
  if (typeof select2 === "function")
  select2 = arrayAll(select2);else

  select2 = selectorAll(select2);
  for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        subgroups.push(select2.call(node, node.__data__, i, group));
        parents.push(node);
      }
    }
  }
  return new Selection(subgroups, parents);
}
function matcher(selector2) {
  return function () {
    return this.matches(selector2);
  };
}
function childMatcher(selector2) {
  return function (node) {
    return node.matches(selector2);
  };
}
var find = Array.prototype.find;
function childFind(match) {
  return function () {
    return find.call(this.children, match);
  };
}
function childFirst() {
  return this.firstElementChild;
}
function selection_selectChild(match) {
  return this.select(match == null ? childFirst : childFind(typeof match === "function" ? match : childMatcher(match)));
}
var filter = Array.prototype.filter;
function children() {
  return Array.from(this.children);
}
function childrenFilter(match) {
  return function () {
    return filter.call(this.children, match);
  };
}
function selection_selectChildren(match) {
  return this.selectAll(match == null ? children : childrenFilter(typeof match === "function" ? match : childMatcher(match)));
}
function selection_filter(match) {
  if (typeof match !== "function")
  match = matcher(match);
  for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
      if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
        subgroup.push(node);
      }
    }
  }
  return new Selection(subgroups, this._parents);
}
function sparse(update) {
  return new Array(update.length);
}
function selection_enter() {
  return new Selection(this._enter || this._groups.map(sparse), this._parents);
}
function EnterNode(parent, datum2) {
  this.ownerDocument = parent.ownerDocument;
  this.namespaceURI = parent.namespaceURI;
  this._next = null;
  this._parent = parent;
  this.__data__ = datum2;
}
EnterNode.prototype = {
  constructor: EnterNode,
  appendChild: function (child) {
    return this._parent.insertBefore(child, this._next);
  },
  insertBefore: function (child, next) {
    return this._parent.insertBefore(child, next);
  },
  querySelector: function (selector2) {
    return this._parent.querySelector(selector2);
  },
  querySelectorAll: function (selector2) {
    return this._parent.querySelectorAll(selector2);
  }
};
function constant$1(x) {
  return function () {
    return x;
  };
}
function bindIndex(parent, group, enter, update, exit, data) {
  var i = 0,node,groupLength = group.length,dataLength = data.length;
  for (; i < dataLength; ++i) {
    if (node = group[i]) {
      node.__data__ = data[i];
      update[i] = node;
    } else {
      enter[i] = new EnterNode(parent, data[i]);
    }
  }
  for (; i < groupLength; ++i) {
    if (node = group[i]) {
      exit[i] = node;
    }
  }
}
function bindKey(parent, group, enter, update, exit, data, key) {
  var i,node,nodeByKeyValue = new Map(),groupLength = group.length,dataLength = data.length,keyValues = new Array(groupLength),keyValue;
  for (i = 0; i < groupLength; ++i) {
    if (node = group[i]) {
      keyValues[i] = keyValue = key.call(node, node.__data__, i, group) + "";
      if (nodeByKeyValue.has(keyValue)) {
        exit[i] = node;
      } else {
        nodeByKeyValue.set(keyValue, node);
      }
    }
  }
  for (i = 0; i < dataLength; ++i) {
    keyValue = key.call(parent, data[i], i, data) + "";
    if (node = nodeByKeyValue.get(keyValue)) {
      update[i] = node;
      node.__data__ = data[i];
      nodeByKeyValue.delete(keyValue);
    } else {
      enter[i] = new EnterNode(parent, data[i]);
    }
  }
  for (i = 0; i < groupLength; ++i) {
    if ((node = group[i]) && nodeByKeyValue.get(keyValues[i]) === node) {
      exit[i] = node;
    }
  }
}
function datum(node) {
  return node.__data__;
}
function selection_data(value, key) {
  if (!arguments.length)
  return Array.from(this, datum);
  var bind = key ? bindKey : bindIndex,parents = this._parents,groups = this._groups;
  if (typeof value !== "function")
  value = constant$1(value);
  for (var m = groups.length, update = new Array(m), enter = new Array(m), exit = new Array(m), j = 0; j < m; ++j) {
    var parent = parents[j],group = groups[j],groupLength = group.length,data = arraylike(value.call(parent, parent && parent.__data__, j, parents)),dataLength = data.length,enterGroup = enter[j] = new Array(dataLength),updateGroup = update[j] = new Array(dataLength),exitGroup = exit[j] = new Array(groupLength);
    bind(parent, group, enterGroup, updateGroup, exitGroup, data, key);
    for (var i0 = 0, i1 = 0, previous, next; i0 < dataLength; ++i0) {
      if (previous = enterGroup[i0]) {
        if (i0 >= i1)
        i1 = i0 + 1;
        while (!(next = updateGroup[i1]) && ++i1 < dataLength)
        ;
        previous._next = next || null;
      }
    }
  }
  update = new Selection(update, parents);
  update._enter = enter;
  update._exit = exit;
  return update;
}
function arraylike(data) {
  return typeof data === "object" && "length" in data ? data : Array.from(data);
}
function selection_exit() {
  return new Selection(this._exit || this._groups.map(sparse), this._parents);
}
function selection_join(onenter, onupdate, onexit) {
  var enter = this.enter(),update = this,exit = this.exit();
  if (typeof onenter === "function") {
    enter = onenter(enter);
    if (enter)
    enter = enter.selection();
  } else {
    enter = enter.append(onenter + "");
  }
  if (onupdate != null) {
    update = onupdate(update);
    if (update)
    update = update.selection();
  }
  if (onexit == null)
  exit.remove();else

  onexit(exit);
  return enter && update ? enter.merge(update).order() : update;
}
function selection_merge(context) {
  var selection2 = context.selection ? context.selection() : context;
  for (var groups0 = this._groups, groups1 = selection2._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
    for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
      if (node = group0[i] || group1[i]) {
        merge[i] = node;
      }
    }
  }
  for (; j < m0; ++j) {
    merges[j] = groups0[j];
  }
  return new Selection(merges, this._parents);
}
function selection_order() {
  for (var groups = this._groups, j = -1, m = groups.length; ++j < m;) {
    for (var group = groups[j], i = group.length - 1, next = group[i], node; --i >= 0;) {
      if (node = group[i]) {
        if (next && node.compareDocumentPosition(next) ^ 4)
        next.parentNode.insertBefore(node, next);
        next = node;
      }
    }
  }
  return this;
}
function selection_sort(compare) {
  if (!compare)
  compare = ascending$2;
  function compareNode(a, b) {
    return a && b ? compare(a.__data__, b.__data__) : !a - !b;
  }
  for (var groups = this._groups, m = groups.length, sortgroups = new Array(m), j = 0; j < m; ++j) {
    for (var group = groups[j], n = group.length, sortgroup = sortgroups[j] = new Array(n), node, i = 0; i < n; ++i) {
      if (node = group[i]) {
        sortgroup[i] = node;
      }
    }
    sortgroup.sort(compareNode);
  }
  return new Selection(sortgroups, this._parents).order();
}
function ascending$2(a, b) {
  return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
}
function selection_call() {
  var callback = arguments[0];
  arguments[0] = this;
  callback.apply(null, arguments);
  return this;
}
function selection_nodes() {
  return Array.from(this);
}
function selection_node() {
  for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
    for (var group = groups[j], i = 0, n = group.length; i < n; ++i) {
      var node = group[i];
      if (node)
      return node;
    }
  }
  return null;
}
function selection_size() {
  let size = 0;
  for (const node of this)
  ++size;
  return size;
}
function selection_empty() {
  return !this.node();
}
function selection_each(callback) {
  for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
    for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
      if (node = group[i])
      callback.call(node, node.__data__, i, group);
    }
  }
  return this;
}
function attrRemove(name) {
  return function () {
    this.removeAttribute(name);
  };
}
function attrRemoveNS(fullname) {
  return function () {
    this.removeAttributeNS(fullname.space, fullname.local);
  };
}
function attrConstant(name, value) {
  return function () {
    this.setAttribute(name, value);
  };
}
function attrConstantNS(fullname, value) {
  return function () {
    this.setAttributeNS(fullname.space, fullname.local, value);
  };
}
function attrFunction(name, value) {
  return function () {
    var v = value.apply(this, arguments);
    if (v == null)
    this.removeAttribute(name);else

    this.setAttribute(name, v);
  };
}
function attrFunctionNS(fullname, value) {
  return function () {
    var v = value.apply(this, arguments);
    if (v == null)
    this.removeAttributeNS(fullname.space, fullname.local);else

    this.setAttributeNS(fullname.space, fullname.local, v);
  };
}
function selection_attr(name, value) {
  var fullname = namespace(name);
  if (arguments.length < 2) {
    var node = this.node();
    return fullname.local ? node.getAttributeNS(fullname.space, fullname.local) : node.getAttribute(fullname);
  }
  return this.each((value == null ? fullname.local ? attrRemoveNS : attrRemove : typeof value === "function" ? fullname.local ? attrFunctionNS : attrFunction : fullname.local ? attrConstantNS : attrConstant)(fullname, value));
}
function defaultView(node) {
  return node.ownerDocument && node.ownerDocument.defaultView || node.document && node || node.defaultView;
}
function styleRemove(name) {
  return function () {
    this.style.removeProperty(name);
  };
}
function styleConstant(name, value, priority) {
  return function () {
    this.style.setProperty(name, value, priority);
  };
}
function styleFunction(name, value, priority) {
  return function () {
    var v = value.apply(this, arguments);
    if (v == null)
    this.style.removeProperty(name);else

    this.style.setProperty(name, v, priority);
  };
}
function selection_style(name, value, priority) {
  return arguments.length > 1 ? this.each((value == null ? styleRemove : typeof value === "function" ? styleFunction : styleConstant)(name, value, priority == null ? "" : priority)) : styleValue(this.node(), name);
}
function styleValue(node, name) {
  return node.style.getPropertyValue(name) || defaultView(node).getComputedStyle(node, null).getPropertyValue(name);
}
function propertyRemove(name) {
  return function () {
    delete this[name];
  };
}
function propertyConstant(name, value) {
  return function () {
    this[name] = value;
  };
}
function propertyFunction(name, value) {
  return function () {
    var v = value.apply(this, arguments);
    if (v == null)
    delete this[name];else

    this[name] = v;
  };
}
function selection_property(name, value) {
  return arguments.length > 1 ? this.each((value == null ? propertyRemove : typeof value === "function" ? propertyFunction : propertyConstant)(name, value)) : this.node()[name];
}
function classArray(string) {
  return string.trim().split(/^|\s+/);
}
function classList(node) {
  return node.classList || new ClassList(node);
}
function ClassList(node) {
  this._node = node;
  this._names = classArray(node.getAttribute("class") || "");
}
ClassList.prototype = {
  add: function (name) {
    var i = this._names.indexOf(name);
    if (i < 0) {
      this._names.push(name);
      this._node.setAttribute("class", this._names.join(" "));
    }
  },
  remove: function (name) {
    var i = this._names.indexOf(name);
    if (i >= 0) {
      this._names.splice(i, 1);
      this._node.setAttribute("class", this._names.join(" "));
    }
  },
  contains: function (name) {
    return this._names.indexOf(name) >= 0;
  }
};
function classedAdd(node, names) {
  var list = classList(node),i = -1,n = names.length;
  while (++i < n)
  list.add(names[i]);
}
function classedRemove(node, names) {
  var list = classList(node),i = -1,n = names.length;
  while (++i < n)
  list.remove(names[i]);
}
function classedTrue(names) {
  return function () {
    classedAdd(this, names);
  };
}
function classedFalse(names) {
  return function () {
    classedRemove(this, names);
  };
}
function classedFunction(names, value) {
  return function () {
    (value.apply(this, arguments) ? classedAdd : classedRemove)(this, names);
  };
}
function selection_classed(name, value) {
  var names = classArray(name + "");
  if (arguments.length < 2) {
    var list = classList(this.node()),i = -1,n = names.length;
    while (++i < n)
    if (!list.contains(names[i]))
    return false;
    return true;
  }
  return this.each((typeof value === "function" ? classedFunction : value ? classedTrue : classedFalse)(names, value));
}
function textRemove() {
  this.textContent = "";
}
function textConstant(value) {
  return function () {
    this.textContent = value;
  };
}
function textFunction(value) {
  return function () {
    var v = value.apply(this, arguments);
    this.textContent = v == null ? "" : v;
  };
}
function selection_text(value) {
  return arguments.length ? this.each(value == null ? textRemove : (typeof value === "function" ? textFunction : textConstant)(value)) : this.node().textContent;
}
function htmlRemove() {
  this.innerHTML = "";
}
function htmlConstant(value) {
  return function () {
    this.innerHTML = value;
  };
}
function htmlFunction(value) {
  return function () {
    var v = value.apply(this, arguments);
    this.innerHTML = v == null ? "" : v;
  };
}
function selection_html(value) {
  return arguments.length ? this.each(value == null ? htmlRemove : (typeof value === "function" ? htmlFunction : htmlConstant)(value)) : this.node().innerHTML;
}
function raise() {
  if (this.nextSibling)
  this.parentNode.appendChild(this);
}
function selection_raise() {
  return this.each(raise);
}
function lower() {
  if (this.previousSibling)
  this.parentNode.insertBefore(this, this.parentNode.firstChild);
}
function selection_lower() {
  return this.each(lower);
}
function selection_append(name) {
  var create2 = typeof name === "function" ? name : creator(name);
  return this.select(function () {
    return this.appendChild(create2.apply(this, arguments));
  });
}
function constantNull() {
  return null;
}
function selection_insert(name, before) {
  var create2 = typeof name === "function" ? name : creator(name),select2 = before == null ? constantNull : typeof before === "function" ? before : selector(before);
  return this.select(function () {
    return this.insertBefore(create2.apply(this, arguments), select2.apply(this, arguments) || null);
  });
}
function remove() {
  var parent = this.parentNode;
  if (parent)
  parent.removeChild(this);
}
function selection_remove() {
  return this.each(remove);
}
function selection_cloneShallow() {
  var clone = this.cloneNode(false),parent = this.parentNode;
  return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
}
function selection_cloneDeep() {
  var clone = this.cloneNode(true),parent = this.parentNode;
  return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
}
function selection_clone(deep) {
  return this.select(deep ? selection_cloneDeep : selection_cloneShallow);
}
function selection_datum(value) {
  return arguments.length ? this.property("__data__", value) : this.node().__data__;
}
function contextListener(listener) {
  return function (event) {
    listener.call(this, event, this.__data__);
  };
}
function parseTypenames(typenames) {
  return typenames.trim().split(/^|\s+/).map(function (t) {
    var name = "",i = t.indexOf(".");
    if (i >= 0)
    name = t.slice(i + 1), t = t.slice(0, i);
    return { type: t, name };
  });
}
function onRemove(typename) {
  return function () {
    var on = this.__on;
    if (!on)
    return;
    for (var j = 0, i = -1, m = on.length, o; j < m; ++j) {
      if (o = on[j], (!typename.type || o.type === typename.type) && o.name === typename.name) {
        this.removeEventListener(o.type, o.listener, o.options);
      } else {
        on[++i] = o;
      }
    }
    if (++i)
    on.length = i;else

    delete this.__on;
  };
}
function onAdd(typename, value, options) {
  return function () {
    var on = this.__on,o,listener = contextListener(value);
    if (on)
    for (var j = 0, m = on.length; j < m; ++j) {
      if ((o = on[j]).type === typename.type && o.name === typename.name) {
        this.removeEventListener(o.type, o.listener, o.options);
        this.addEventListener(o.type, o.listener = listener, o.options = options);
        o.value = value;
        return;
      }
    }
    this.addEventListener(typename.type, listener, options);
    o = { type: typename.type, name: typename.name, value, listener, options };
    if (!on)
    this.__on = [o];else

    on.push(o);
  };
}
function selection_on(typename, value, options) {
  var typenames = parseTypenames(typename + ""),i,n = typenames.length,t;
  if (arguments.length < 2) {
    var on = this.node().__on;
    if (on)
    for (var j = 0, m = on.length, o; j < m; ++j) {
      for (i = 0, o = on[j]; i < n; ++i) {
        if ((t = typenames[i]).type === o.type && t.name === o.name) {
          return o.value;
        }
      }
    }
    return;
  }
  on = value ? onAdd : onRemove;
  for (i = 0; i < n; ++i)
  this.each(on(typenames[i], value, options));
  return this;
}
function dispatchEvent(node, type, params) {
  var window = defaultView(node),event = window.CustomEvent;
  if (typeof event === "function") {
    event = new event(type, params);
  } else {
    event = window.document.createEvent("Event");
    if (params)
    event.initEvent(type, params.bubbles, params.cancelable), event.detail = params.detail;else

    event.initEvent(type, false, false);
  }
  node.dispatchEvent(event);
}
function dispatchConstant(type, params) {
  return function () {
    return dispatchEvent(this, type, params);
  };
}
function dispatchFunction(type, params) {
  return function () {
    return dispatchEvent(this, type, params.apply(this, arguments));
  };
}
function selection_dispatch(type, params) {
  return this.each((typeof params === "function" ? dispatchFunction : dispatchConstant)(type, params));
}
function* selection_iterator() {
  for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
    for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
      if (node = group[i])
      yield node;
    }
  }
}
var root = [null];
function Selection(groups, parents) {
  this._groups = groups;
  this._parents = parents;
}
function selection_selection() {
  return this;
}
Selection.prototype = {
  constructor: Selection,
  select: selection_select,
  selectAll: selection_selectAll,
  selectChild: selection_selectChild,
  selectChildren: selection_selectChildren,
  filter: selection_filter,
  data: selection_data,
  enter: selection_enter,
  exit: selection_exit,
  join: selection_join,
  merge: selection_merge,
  selection: selection_selection,
  order: selection_order,
  sort: selection_sort,
  call: selection_call,
  nodes: selection_nodes,
  node: selection_node,
  size: selection_size,
  empty: selection_empty,
  each: selection_each,
  attr: selection_attr,
  style: selection_style,
  property: selection_property,
  classed: selection_classed,
  text: selection_text,
  html: selection_html,
  raise: selection_raise,
  lower: selection_lower,
  append: selection_append,
  insert: selection_insert,
  remove: selection_remove,
  clone: selection_clone,
  datum: selection_datum,
  on: selection_on,
  dispatch: selection_dispatch,
  [Symbol.iterator]: selection_iterator
};
function select(selector2) {
  return typeof selector2 === "string" ? new Selection([[document.querySelector(selector2)]], [document.documentElement]) : new Selection([[selector2]], root);
}
var nextId = 0;
function Local() {
  this._ = "@" + (++nextId).toString(36);
}
Local.prototype = {
  constructor: Local,
  get: function (node) {
    var id = this._;
    while (!(id in node))
    if (!(node = node.parentNode))
    return;
    return node[id];
  },
  set: function (node, value) {
    return node[this._] = value;
  },
  remove: function (node) {
    return this._ in node && delete node[this._];
  },
  toString: function () {
    return this._;
  }
};
function sourceEvent(event) {
  let sourceEvent2;
  while (sourceEvent2 = event.sourceEvent)
  event = sourceEvent2;
  return event;
}
function pointer(event, node) {
  event = sourceEvent(event);
  if (node === void 0)
  node = event.currentTarget;
  if (node) {
    var svg = node.ownerSVGElement || node;
    if (svg.createSVGPoint) {
      var point = svg.createSVGPoint();
      point.x = event.clientX, point.y = event.clientY;
      point = point.matrixTransform(node.getScreenCTM().inverse());
      return [point.x, point.y];
    }
    if (node.getBoundingClientRect) {
      var rect = node.getBoundingClientRect();
      return [event.clientX - rect.left - node.clientLeft, event.clientY - rect.top - node.clientTop];
    }
  }
  return [event.pageX, event.pageY];
}
function selectAll(selector2) {
  return typeof selector2 === "string" ? new Selection([document.querySelectorAll(selector2)], [document.documentElement]) : new Selection([array(selector2)], root);
}

function ascending$1(a, b) {
  return a == null || b == null ? NaN : a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
}
function descending$1(a, b) {
  return a == null || b == null ? NaN : b < a ? -1 : b > a ? 1 : b >= a ? 0 : NaN;
}
function bisector$1(f) {
  let compare1, compare2, delta;
  if (f.length !== 2) {
    compare1 = ascending$1;
    compare2 = (d, x) => ascending$1(f(d), x);
    delta = (d, x) => f(d) - x;
  } else {
    compare1 = f === ascending$1 || f === descending$1 ? f : zero$1;
    compare2 = f;
    delta = f;
  }
  function left(a, x, lo = 0, hi = a.length) {
    if (lo < hi) {
      if (compare1(x, x) !== 0)
      return hi;
      do {
        const mid = lo + hi >>> 1;
        if (compare2(a[mid], x) < 0)
        lo = mid + 1;else

        hi = mid;
      } while (lo < hi);
    }
    return lo;
  }
  function right(a, x, lo = 0, hi = a.length) {
    if (lo < hi) {
      if (compare1(x, x) !== 0)
      return hi;
      do {
        const mid = lo + hi >>> 1;
        if (compare2(a[mid], x) <= 0)
        lo = mid + 1;else

        hi = mid;
      } while (lo < hi);
    }
    return lo;
  }
  function center(a, x, lo = 0, hi = a.length) {
    const i = left(a, x, lo, hi - 1);
    return i > lo && delta(a[i - 1], x) > -delta(a[i], x) ? i - 1 : i;
  }
  return { left, center, right };
}
function zero$1() {
  return 0;
}
function number$1(x) {
  return x === null ? NaN : +x;
}
bisector$1(ascending$1);
bisector$1(number$1).center;
class Adder {
  constructor() {
    this._partials = new Float64Array(32);
    this._n = 0;
  }
  add(x) {
    const p = this._partials;
    let i = 0;
    for (let j = 0; j < this._n && j < 32; j++) {
      const y = p[j],hi = x + y,lo = Math.abs(x) < Math.abs(y) ? x - (hi - y) : y - (hi - x);
      if (lo)
      p[i++] = lo;
      x = hi;
    }
    p[i] = x;
    this._n = i + 1;
    return this;
  }
  valueOf() {
    const p = this._partials;
    let n = this._n,x,y,lo,hi = 0;
    if (n > 0) {
      hi = p[--n];
      while (n > 0) {
        x = hi;
        y = p[--n];
        hi = x + y;
        lo = y - (hi - x);
        if (lo)
        break;
      }
      if (n > 0 && (lo < 0 && p[n - 1] < 0 || lo > 0 && p[n - 1] > 0)) {
        y = lo * 2;
        x = hi + y;
        if (y == x - hi)
        hi = x;
      }
    }
    return hi;
  }
}
function* flatten$1(arrays) {
  for (const array2 of arrays) {
    yield* array2;
  }
}
function merge(arrays) {
  return Array.from(flatten$1(arrays));
}
function range(start, stop, step) {
  start = +start, stop = +stop, step = (n = arguments.length) < 2 ? (stop = start, start = 0, 1) : n < 3 ? 1 : +step;
  var i = -1,n = Math.max(0, Math.ceil((stop - start) / step)) | 0,range2 = new Array(n);
  while (++i < n) {
    range2[i] = start + i * step;
  }
  return range2;
}

var epsilon = 1e-6;
var epsilon2 = 1e-12;
var pi = Math.PI;
var halfPi = pi / 2;
var quarterPi = pi / 4;
var tau = pi * 2;
var degrees$1 = 180 / pi;
var radians$1 = pi / 180;
var abs = Math.abs;
var atan = Math.atan;
var atan2$1 = Math.atan2;
var cos$1 = Math.cos;
var ceil = Math.ceil;
var hypot$1 = Math.hypot;
var sin$1 = Math.sin;
var sign = Math.sign || function (x) {
  return x > 0 ? 1 : x < 0 ? -1 : 0;
};
var sqrt = Math.sqrt;
function acos$1(x) {
  return x > 1 ? 0 : x < -1 ? pi : Math.acos(x);
}
function asin$1(x) {
  return x > 1 ? halfPi : x < -1 ? -halfPi : Math.asin(x);
}
function haversin(x) {
  return (x = sin$1(x / 2)) * x;
}
function noop() {
}
function streamGeometry(geometry, stream) {
  if (geometry && streamGeometryType.hasOwnProperty(geometry.type)) {
    streamGeometryType[geometry.type](geometry, stream);
  }
}
var streamObjectType = {
  Feature: function (object2, stream) {
    streamGeometry(object2.geometry, stream);
  },
  FeatureCollection: function (object2, stream) {
    var features = object2.features,i = -1,n = features.length;
    while (++i < n)
    streamGeometry(features[i].geometry, stream);
  }
};
var streamGeometryType = {
  Sphere: function (object2, stream) {
    stream.sphere();
  },
  Point: function (object2, stream) {
    object2 = object2.coordinates;
    stream.point(object2[0], object2[1], object2[2]);
  },
  MultiPoint: function (object2, stream) {
    var coordinates2 = object2.coordinates,i = -1,n = coordinates2.length;
    while (++i < n)
    object2 = coordinates2[i], stream.point(object2[0], object2[1], object2[2]);
  },
  LineString: function (object2, stream) {
    streamLine(object2.coordinates, stream, 0);
  },
  MultiLineString: function (object2, stream) {
    var coordinates2 = object2.coordinates,i = -1,n = coordinates2.length;
    while (++i < n)
    streamLine(coordinates2[i], stream, 0);
  },
  Polygon: function (object2, stream) {
    streamPolygon(object2.coordinates, stream);
  },
  MultiPolygon: function (object2, stream) {
    var coordinates2 = object2.coordinates,i = -1,n = coordinates2.length;
    while (++i < n)
    streamPolygon(coordinates2[i], stream);
  },
  GeometryCollection: function (object2, stream) {
    var geometries = object2.geometries,i = -1,n = geometries.length;
    while (++i < n)
    streamGeometry(geometries[i], stream);
  }
};
function streamLine(coordinates2, stream, closed) {
  var i = -1,n = coordinates2.length - closed,coordinate;
  stream.lineStart();
  while (++i < n)
  coordinate = coordinates2[i], stream.point(coordinate[0], coordinate[1], coordinate[2]);
  stream.lineEnd();
}
function streamPolygon(coordinates2, stream) {
  var i = -1,n = coordinates2.length;
  stream.polygonStart();
  while (++i < n)
  streamLine(coordinates2[i], stream, 1);
  stream.polygonEnd();
}
function geoStream(object2, stream) {
  if (object2 && streamObjectType.hasOwnProperty(object2.type)) {
    streamObjectType[object2.type](object2, stream);
  } else {
    streamGeometry(object2, stream);
  }
}
new Adder();
new Adder();
function spherical(cartesian2) {
  return [atan2$1(cartesian2[1], cartesian2[0]), asin$1(cartesian2[2])];
}
function cartesian(spherical2) {
  var lambda = spherical2[0],phi = spherical2[1],cosPhi = cos$1(phi);
  return [cosPhi * cos$1(lambda), cosPhi * sin$1(lambda), sin$1(phi)];
}
function cartesianDot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function cartesianCross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function cartesianAddInPlace(a, b) {
  a[0] += b[0], a[1] += b[1], a[2] += b[2];
}
function cartesianScale(vector, k) {
  return [vector[0] * k, vector[1] * k, vector[2] * k];
}
function cartesianNormalizeInPlace(d) {
  var l = sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]);
  d[0] /= l, d[1] /= l, d[2] /= l;
}
var W0, W1, X0, Y0, Z0, X1, Y1, Z1, X2, Y2, Z2, lambda00$2, phi00$2, x0, y0, z0;
var centroidStream = {
  sphere: noop,
  point: centroidPoint,
  lineStart: centroidLineStart,
  lineEnd: centroidLineEnd,
  polygonStart: function () {
    centroidStream.lineStart = centroidRingStart;
    centroidStream.lineEnd = centroidRingEnd;
  },
  polygonEnd: function () {
    centroidStream.lineStart = centroidLineStart;
    centroidStream.lineEnd = centroidLineEnd;
  }
};
function centroidPoint(lambda, phi) {
  lambda *= radians$1, phi *= radians$1;
  var cosPhi = cos$1(phi);
  centroidPointCartesian(cosPhi * cos$1(lambda), cosPhi * sin$1(lambda), sin$1(phi));
}
function centroidPointCartesian(x, y, z) {
  ++W0;
  X0 += (x - X0) / W0;
  Y0 += (y - Y0) / W0;
  Z0 += (z - Z0) / W0;
}
function centroidLineStart() {
  centroidStream.point = centroidLinePointFirst;
}
function centroidLinePointFirst(lambda, phi) {
  lambda *= radians$1, phi *= radians$1;
  var cosPhi = cos$1(phi);
  x0 = cosPhi * cos$1(lambda);
  y0 = cosPhi * sin$1(lambda);
  z0 = sin$1(phi);
  centroidStream.point = centroidLinePoint;
  centroidPointCartesian(x0, y0, z0);
}
function centroidLinePoint(lambda, phi) {
  lambda *= radians$1, phi *= radians$1;
  var cosPhi = cos$1(phi),x = cosPhi * cos$1(lambda),y = cosPhi * sin$1(lambda),z = sin$1(phi),w = atan2$1(sqrt((w = y0 * z - z0 * y) * w + (w = z0 * x - x0 * z) * w + (w = x0 * y - y0 * x) * w), x0 * x + y0 * y + z0 * z);
  W1 += w;
  X1 += w * (x0 + (x0 = x));
  Y1 += w * (y0 + (y0 = y));
  Z1 += w * (z0 + (z0 = z));
  centroidPointCartesian(x0, y0, z0);
}
function centroidLineEnd() {
  centroidStream.point = centroidPoint;
}
function centroidRingStart() {
  centroidStream.point = centroidRingPointFirst;
}
function centroidRingEnd() {
  centroidRingPoint(lambda00$2, phi00$2);
  centroidStream.point = centroidPoint;
}
function centroidRingPointFirst(lambda, phi) {
  lambda00$2 = lambda, phi00$2 = phi;
  lambda *= radians$1, phi *= radians$1;
  centroidStream.point = centroidRingPoint;
  var cosPhi = cos$1(phi);
  x0 = cosPhi * cos$1(lambda);
  y0 = cosPhi * sin$1(lambda);
  z0 = sin$1(phi);
  centroidPointCartesian(x0, y0, z0);
}
function centroidRingPoint(lambda, phi) {
  lambda *= radians$1, phi *= radians$1;
  var cosPhi = cos$1(phi),x = cosPhi * cos$1(lambda),y = cosPhi * sin$1(lambda),z = sin$1(phi),cx = y0 * z - z0 * y,cy = z0 * x - x0 * z,cz = x0 * y - y0 * x,m = hypot$1(cx, cy, cz),w = asin$1(m),v = m && -w / m;
  X2.add(v * cx);
  Y2.add(v * cy);
  Z2.add(v * cz);
  W1 += w;
  X1 += w * (x0 + (x0 = x));
  Y1 += w * (y0 + (y0 = y));
  Z1 += w * (z0 + (z0 = z));
  centroidPointCartesian(x0, y0, z0);
}
function centroid(object2) {
  W0 = W1 = X0 = Y0 = Z0 = X1 = Y1 = Z1 = 0;
  X2 = new Adder();
  Y2 = new Adder();
  Z2 = new Adder();
  geoStream(object2, centroidStream);
  var x = +X2,y = +Y2,z = +Z2,m = hypot$1(x, y, z);
  if (m < epsilon2) {
    x = X1, y = Y1, z = Z1;
    if (W1 < epsilon)
    x = X0, y = Y0, z = Z0;
    m = hypot$1(x, y, z);
    if (m < epsilon2)
    return [NaN, NaN];
  }
  return [atan2$1(y, x) * degrees$1, asin$1(z / m) * degrees$1];
}
function constant(x) {
  return function () {
    return x;
  };
}
function compose(a, b) {
  function compose2(x, y) {
    return x = a(x, y), b(x[0], x[1]);
  }
  if (a.invert && b.invert)
  compose2.invert = function (x, y) {
    return x = b.invert(x, y), x && a.invert(x[0], x[1]);
  };
  return compose2;
}
function rotationIdentity(lambda, phi) {
  if (abs(lambda) > pi)
  lambda -= Math.round(lambda / tau) * tau;
  return [lambda, phi];
}
rotationIdentity.invert = rotationIdentity;
function rotateRadians(deltaLambda, deltaPhi, deltaGamma) {
  return (deltaLambda %= tau) ? deltaPhi || deltaGamma ? compose(rotationLambda(deltaLambda), rotationPhiGamma(deltaPhi, deltaGamma)) : rotationLambda(deltaLambda) : deltaPhi || deltaGamma ? rotationPhiGamma(deltaPhi, deltaGamma) : rotationIdentity;
}
function forwardRotationLambda(deltaLambda) {
  return function (lambda, phi) {
    lambda += deltaLambda;
    if (abs(lambda) > pi)
    lambda -= Math.round(lambda / tau) * tau;
    return [lambda, phi];
  };
}
function rotationLambda(deltaLambda) {
  var rotation2 = forwardRotationLambda(deltaLambda);
  rotation2.invert = forwardRotationLambda(-deltaLambda);
  return rotation2;
}
function rotationPhiGamma(deltaPhi, deltaGamma) {
  var cosDeltaPhi = cos$1(deltaPhi),sinDeltaPhi = sin$1(deltaPhi),cosDeltaGamma = cos$1(deltaGamma),sinDeltaGamma = sin$1(deltaGamma);
  function rotation2(lambda, phi) {
    var cosPhi = cos$1(phi),x = cos$1(lambda) * cosPhi,y = sin$1(lambda) * cosPhi,z = sin$1(phi),k = z * cosDeltaPhi + x * sinDeltaPhi;
    return [
    atan2$1(y * cosDeltaGamma - k * sinDeltaGamma, x * cosDeltaPhi - z * sinDeltaPhi),
    asin$1(k * cosDeltaGamma + y * sinDeltaGamma)];

  }
  rotation2.invert = function (lambda, phi) {
    var cosPhi = cos$1(phi),x = cos$1(lambda) * cosPhi,y = sin$1(lambda) * cosPhi,z = sin$1(phi),k = z * cosDeltaGamma - y * sinDeltaGamma;
    return [
    atan2$1(y * cosDeltaGamma + z * sinDeltaGamma, x * cosDeltaPhi + k * sinDeltaPhi),
    asin$1(k * cosDeltaPhi - x * sinDeltaPhi)];

  };
  return rotation2;
}
function rotation(rotate) {
  rotate = rotateRadians(rotate[0] * radians$1, rotate[1] * radians$1, rotate.length > 2 ? rotate[2] * radians$1 : 0);
  function forward(coordinates2) {
    coordinates2 = rotate(coordinates2[0] * radians$1, coordinates2[1] * radians$1);
    return coordinates2[0] *= degrees$1, coordinates2[1] *= degrees$1, coordinates2;
  }
  forward.invert = function (coordinates2) {
    coordinates2 = rotate.invert(coordinates2[0] * radians$1, coordinates2[1] * radians$1);
    return coordinates2[0] *= degrees$1, coordinates2[1] *= degrees$1, coordinates2;
  };
  return forward;
}
function circleStream(stream, radius, delta, direction, t0, t1) {
  if (!delta)
  return;
  var cosRadius = cos$1(radius),sinRadius = sin$1(radius),step = direction * delta;
  if (t0 == null) {
    t0 = radius + direction * tau;
    t1 = radius - step / 2;
  } else {
    t0 = circleRadius(cosRadius, t0);
    t1 = circleRadius(cosRadius, t1);
    if (direction > 0 ? t0 < t1 : t0 > t1)
    t0 += direction * tau;
  }
  for (var point, t = t0; direction > 0 ? t > t1 : t < t1; t -= step) {
    point = spherical([cosRadius, -sinRadius * cos$1(t), -sinRadius * sin$1(t)]);
    stream.point(point[0], point[1]);
  }
}
function circleRadius(cosRadius, point) {
  point = cartesian(point), point[0] -= cosRadius;
  cartesianNormalizeInPlace(point);
  var radius = acos$1(-point[1]);
  return ((-point[2] < 0 ? -radius : radius) + tau - epsilon) % tau;
}
function circle() {
  var center = constant([0, 0]),radius = constant(90),precision = constant(6),ring,rotate,stream = { point };
  function point(x, y) {
    ring.push(x = rotate(x, y));
    x[0] *= degrees$1, x[1] *= degrees$1;
  }
  function circle2() {
    var c = center.apply(this, arguments),r = radius.apply(this, arguments) * radians$1,p = precision.apply(this, arguments) * radians$1;
    ring = [];
    rotate = rotateRadians(-c[0] * radians$1, -c[1] * radians$1, 0).invert;
    circleStream(stream, r, p, 1);
    c = { type: "Polygon", coordinates: [ring] };
    ring = rotate = null;
    return c;
  }
  circle2.center = function (_) {
    return arguments.length ? (center = typeof _ === "function" ? _ : constant([+_[0], +_[1]]), circle2) : center;
  };
  circle2.radius = function (_) {
    return arguments.length ? (radius = typeof _ === "function" ? _ : constant(+_), circle2) : radius;
  };
  circle2.precision = function (_) {
    return arguments.length ? (precision = typeof _ === "function" ? _ : constant(+_), circle2) : precision;
  };
  return circle2;
}
function clipBuffer() {
  var lines = [],line;
  return {
    point: function (x, y, m) {
      line.push([x, y, m]);
    },
    lineStart: function () {
      lines.push(line = []);
    },
    lineEnd: noop,
    rejoin: function () {
      if (lines.length > 1)
      lines.push(lines.pop().concat(lines.shift()));
    },
    result: function () {
      var result = lines;
      lines = [];
      line = null;
      return result;
    }
  };
}
function pointEqual(a, b) {
  return abs(a[0] - b[0]) < epsilon && abs(a[1] - b[1]) < epsilon;
}
function Intersection(point, points, other, entry) {
  this.x = point;
  this.z = points;
  this.o = other;
  this.e = entry;
  this.v = false;
  this.n = this.p = null;
}
function clipRejoin(segments, compareIntersection2, startInside, interpolate2, stream) {
  var subject = [],clip2 = [],i,n;
  segments.forEach(function (segment) {
    if ((n2 = segment.length - 1) <= 0)
    return;
    var n2,p02 = segment[0],p1 = segment[n2],x;
    if (pointEqual(p02, p1)) {
      if (!p02[2] && !p1[2]) {
        stream.lineStart();
        for (i = 0; i < n2; ++i)
        stream.point((p02 = segment[i])[0], p02[1]);
        stream.lineEnd();
        return;
      }
      p1[0] += 2 * epsilon;
    }
    subject.push(x = new Intersection(p02, segment, null, true));
    clip2.push(x.o = new Intersection(p02, null, x, false));
    subject.push(x = new Intersection(p1, segment, null, false));
    clip2.push(x.o = new Intersection(p1, null, x, true));
  });
  if (!subject.length)
  return;
  clip2.sort(compareIntersection2);
  link(subject);
  link(clip2);
  for (i = 0, n = clip2.length; i < n; ++i) {
    clip2[i].e = startInside = !startInside;
  }
  var start = subject[0],points,point;
  while (1) {
    var current = start,isSubject = true;
    while (current.v)
    if ((current = current.n) === start)
    return;
    points = current.z;
    stream.lineStart();
    do {
      current.v = current.o.v = true;
      if (current.e) {
        if (isSubject) {
          for (i = 0, n = points.length; i < n; ++i)
          stream.point((point = points[i])[0], point[1]);
        } else {
          interpolate2(current.x, current.n.x, 1, stream);
        }
        current = current.n;
      } else {
        if (isSubject) {
          points = current.p.z;
          for (i = points.length - 1; i >= 0; --i)
          stream.point((point = points[i])[0], point[1]);
        } else {
          interpolate2(current.x, current.p.x, -1, stream);
        }
        current = current.p;
      }
      current = current.o;
      points = current.z;
      isSubject = !isSubject;
    } while (!current.v);
    stream.lineEnd();
  }
}
function link(array) {
  if (!(n = array.length))
  return;
  var n,i = 0,a = array[0],b;
  while (++i < n) {
    a.n = b = array[i];
    b.p = a;
    a = b;
  }
  a.n = b = array[0];
  b.p = a;
}
function longitude(point) {
  return abs(point[0]) <= pi ? point[0] : sign(point[0]) * ((abs(point[0]) + pi) % tau - pi);
}
function polygonContains(polygon, point) {
  var lambda = longitude(point),phi = point[1],sinPhi = sin$1(phi),normal = [sin$1(lambda), -cos$1(lambda), 0],angle2 = 0,winding = 0;
  var sum = new Adder();
  if (sinPhi === 1)
  phi = halfPi + epsilon;else
  if (sinPhi === -1)
  phi = -halfPi - epsilon;
  for (var i = 0, n = polygon.length; i < n; ++i) {
    if (!(m = (ring = polygon[i]).length))
    continue;
    var ring,m,point0 = ring[m - 1],lambda02 = longitude(point0),phi02 = point0[1] / 2 + quarterPi,sinPhi02 = sin$1(phi02),cosPhi02 = cos$1(phi02);
    for (var j = 0; j < m; ++j, lambda02 = lambda12, sinPhi02 = sinPhi1, cosPhi02 = cosPhi1, point0 = point1) {
      var point1 = ring[j],lambda12 = longitude(point1),phi12 = point1[1] / 2 + quarterPi,sinPhi1 = sin$1(phi12),cosPhi1 = cos$1(phi12),delta = lambda12 - lambda02,sign2 = delta >= 0 ? 1 : -1,absDelta = sign2 * delta,antimeridian = absDelta > pi,k = sinPhi02 * sinPhi1;
      sum.add(atan2$1(k * sign2 * sin$1(absDelta), cosPhi02 * cosPhi1 + k * cos$1(absDelta)));
      angle2 += antimeridian ? delta + sign2 * tau : delta;
      if (antimeridian ^ lambda02 >= lambda ^ lambda12 >= lambda) {
        var arc = cartesianCross(cartesian(point0), cartesian(point1));
        cartesianNormalizeInPlace(arc);
        var intersection = cartesianCross(normal, arc);
        cartesianNormalizeInPlace(intersection);
        var phiArc = (antimeridian ^ delta >= 0 ? -1 : 1) * asin$1(intersection[2]);
        if (phi > phiArc || phi === phiArc && (arc[0] || arc[1])) {
          winding += antimeridian ^ delta >= 0 ? 1 : -1;
        }
      }
    }
  }
  return (angle2 < -epsilon || angle2 < epsilon && sum < -epsilon2) ^ winding & 1;
}
function clip(pointVisible, clipLine2, interpolate2, start) {
  return function (sink) {
    var line = clipLine2(sink),ringBuffer = clipBuffer(),ringSink = clipLine2(ringBuffer),polygonStarted = false,polygon,segments,ring;
    var clip2 = {
      point,
      lineStart,
      lineEnd,
      polygonStart: function () {
        clip2.point = pointRing;
        clip2.lineStart = ringStart;
        clip2.lineEnd = ringEnd;
        segments = [];
        polygon = [];
      },
      polygonEnd: function () {
        clip2.point = point;
        clip2.lineStart = lineStart;
        clip2.lineEnd = lineEnd;
        segments = merge(segments);
        var startInside = polygonContains(polygon, start);
        if (segments.length) {
          if (!polygonStarted)
          sink.polygonStart(), polygonStarted = true;
          clipRejoin(segments, compareIntersection, startInside, interpolate2, sink);
        } else if (startInside) {
          if (!polygonStarted)
          sink.polygonStart(), polygonStarted = true;
          sink.lineStart();
          interpolate2(null, null, 1, sink);
          sink.lineEnd();
        }
        if (polygonStarted)
        sink.polygonEnd(), polygonStarted = false;
        segments = polygon = null;
      },
      sphere: function () {
        sink.polygonStart();
        sink.lineStart();
        interpolate2(null, null, 1, sink);
        sink.lineEnd();
        sink.polygonEnd();
      }
    };
    function point(lambda, phi) {
      if (pointVisible(lambda, phi))
      sink.point(lambda, phi);
    }
    function pointLine(lambda, phi) {
      line.point(lambda, phi);
    }
    function lineStart() {
      clip2.point = pointLine;
      line.lineStart();
    }
    function lineEnd() {
      clip2.point = point;
      line.lineEnd();
    }
    function pointRing(lambda, phi) {
      ring.push([lambda, phi]);
      ringSink.point(lambda, phi);
    }
    function ringStart() {
      ringSink.lineStart();
      ring = [];
    }
    function ringEnd() {
      pointRing(ring[0][0], ring[0][1]);
      ringSink.lineEnd();
      var clean = ringSink.clean(),ringSegments = ringBuffer.result(),i,n = ringSegments.length,m,segment,point2;
      ring.pop();
      polygon.push(ring);
      ring = null;
      if (!n)
      return;
      if (clean & 1) {
        segment = ringSegments[0];
        if ((m = segment.length - 1) > 0) {
          if (!polygonStarted)
          sink.polygonStart(), polygonStarted = true;
          sink.lineStart();
          for (i = 0; i < m; ++i)
          sink.point((point2 = segment[i])[0], point2[1]);
          sink.lineEnd();
        }
        return;
      }
      if (n > 1 && clean & 2)
      ringSegments.push(ringSegments.pop().concat(ringSegments.shift()));
      segments.push(ringSegments.filter(validSegment));
    }
    return clip2;
  };
}
function validSegment(segment) {
  return segment.length > 1;
}
function compareIntersection(a, b) {
  return ((a = a.x)[0] < 0 ? a[1] - halfPi - epsilon : halfPi - a[1]) - ((b = b.x)[0] < 0 ? b[1] - halfPi - epsilon : halfPi - b[1]);
}
var clipAntimeridian = clip(function () {
  return true;
}, clipAntimeridianLine, clipAntimeridianInterpolate, [-pi, -halfPi]);
function clipAntimeridianLine(stream) {
  var lambda02 = NaN,phi02 = NaN,sign0 = NaN,clean;
  return {
    lineStart: function () {
      stream.lineStart();
      clean = 1;
    },
    point: function (lambda12, phi12) {
      var sign1 = lambda12 > 0 ? pi : -pi,delta = abs(lambda12 - lambda02);
      if (abs(delta - pi) < epsilon) {
        stream.point(lambda02, phi02 = (phi02 + phi12) / 2 > 0 ? halfPi : -halfPi);
        stream.point(sign0, phi02);
        stream.lineEnd();
        stream.lineStart();
        stream.point(sign1, phi02);
        stream.point(lambda12, phi02);
        clean = 0;
      } else if (sign0 !== sign1 && delta >= pi) {
        if (abs(lambda02 - sign0) < epsilon)
        lambda02 -= sign0 * epsilon;
        if (abs(lambda12 - sign1) < epsilon)
        lambda12 -= sign1 * epsilon;
        phi02 = clipAntimeridianIntersect(lambda02, phi02, lambda12, phi12);
        stream.point(sign0, phi02);
        stream.lineEnd();
        stream.lineStart();
        stream.point(sign1, phi02);
        clean = 0;
      }
      stream.point(lambda02 = lambda12, phi02 = phi12);
      sign0 = sign1;
    },
    lineEnd: function () {
      stream.lineEnd();
      lambda02 = phi02 = NaN;
    },
    clean: function () {
      return 2 - clean;
    }
  };
}
function clipAntimeridianIntersect(lambda02, phi02, lambda12, phi12) {
  var cosPhi02,cosPhi1,sinLambda0Lambda1 = sin$1(lambda02 - lambda12);
  return abs(sinLambda0Lambda1) > epsilon ? atan((sin$1(phi02) * (cosPhi1 = cos$1(phi12)) * sin$1(lambda12) - sin$1(phi12) * (cosPhi02 = cos$1(phi02)) * sin$1(lambda02)) / (cosPhi02 * cosPhi1 * sinLambda0Lambda1)) : (phi02 + phi12) / 2;
}
function clipAntimeridianInterpolate(from, to, direction, stream) {
  var phi;
  if (from == null) {
    phi = direction * halfPi;
    stream.point(-pi, phi);
    stream.point(0, phi);
    stream.point(pi, phi);
    stream.point(pi, 0);
    stream.point(pi, -phi);
    stream.point(0, -phi);
    stream.point(-pi, -phi);
    stream.point(-pi, 0);
    stream.point(-pi, phi);
  } else if (abs(from[0] - to[0]) > epsilon) {
    var lambda = from[0] < to[0] ? pi : -pi;
    phi = direction * lambda / 2;
    stream.point(-lambda, phi);
    stream.point(0, phi);
    stream.point(lambda, phi);
  } else {
    stream.point(to[0], to[1]);
  }
}
function clipCircle(radius) {
  var cr = cos$1(radius),delta = 6 * radians$1,smallRadius = cr > 0,notHemisphere = abs(cr) > epsilon;
  function interpolate2(from, to, direction, stream) {
    circleStream(stream, radius, delta, direction, from, to);
  }
  function visible(lambda, phi) {
    return cos$1(lambda) * cos$1(phi) > cr;
  }
  function clipLine2(stream) {
    var point0, c0, v0, v00, clean;
    return {
      lineStart: function () {
        v00 = v0 = false;
        clean = 1;
      },
      point: function (lambda, phi) {
        var point1 = [lambda, phi],point2,v = visible(lambda, phi),c = smallRadius ? v ? 0 : code(lambda, phi) : v ? code(lambda + (lambda < 0 ? pi : -pi), phi) : 0;
        if (!point0 && (v00 = v0 = v))
        stream.lineStart();
        if (v !== v0) {
          point2 = intersect(point0, point1);
          if (!point2 || pointEqual(point0, point2) || pointEqual(point1, point2))
          point1[2] = 1;
        }
        if (v !== v0) {
          clean = 0;
          if (v) {
            stream.lineStart();
            point2 = intersect(point1, point0);
            stream.point(point2[0], point2[1]);
          } else {
            point2 = intersect(point0, point1);
            stream.point(point2[0], point2[1], 2);
            stream.lineEnd();
          }
          point0 = point2;
        } else if (notHemisphere && point0 && smallRadius ^ v) {
          var t;
          if (!(c & c0) && (t = intersect(point1, point0, true))) {
            clean = 0;
            if (smallRadius) {
              stream.lineStart();
              stream.point(t[0][0], t[0][1]);
              stream.point(t[1][0], t[1][1]);
              stream.lineEnd();
            } else {
              stream.point(t[1][0], t[1][1]);
              stream.lineEnd();
              stream.lineStart();
              stream.point(t[0][0], t[0][1], 3);
            }
          }
        }
        if (v && (!point0 || !pointEqual(point0, point1))) {
          stream.point(point1[0], point1[1]);
        }
        point0 = point1, v0 = v, c0 = c;
      },
      lineEnd: function () {
        if (v0)
        stream.lineEnd();
        point0 = null;
      },
      clean: function () {
        return clean | (v00 && v0) << 1;
      }
    };
  }
  function intersect(a, b, two) {
    var pa = cartesian(a),pb = cartesian(b);
    var n1 = [1, 0, 0],n2 = cartesianCross(pa, pb),n2n2 = cartesianDot(n2, n2),n1n2 = n2[0],determinant = n2n2 - n1n2 * n1n2;
    if (!determinant)
    return !two && a;
    var c1 = cr * n2n2 / determinant,c2 = -cr * n1n2 / determinant,n1xn2 = cartesianCross(n1, n2),A = cartesianScale(n1, c1),B = cartesianScale(n2, c2);
    cartesianAddInPlace(A, B);
    var u = n1xn2,w = cartesianDot(A, u),uu = cartesianDot(u, u),t2 = w * w - uu * (cartesianDot(A, A) - 1);
    if (t2 < 0)
    return;
    var t = sqrt(t2),q = cartesianScale(u, (-w - t) / uu);
    cartesianAddInPlace(q, A);
    q = spherical(q);
    if (!two)
    return q;
    var lambda02 = a[0],lambda12 = b[0],phi02 = a[1],phi12 = b[1],z;
    if (lambda12 < lambda02)
    z = lambda02, lambda02 = lambda12, lambda12 = z;
    var delta2 = lambda12 - lambda02,polar = abs(delta2 - pi) < epsilon,meridian = polar || delta2 < epsilon;
    if (!polar && phi12 < phi02)
    z = phi02, phi02 = phi12, phi12 = z;
    if (meridian ? polar ? phi02 + phi12 > 0 ^ q[1] < (abs(q[0] - lambda02) < epsilon ? phi02 : phi12) : phi02 <= q[1] && q[1] <= phi12 : delta2 > pi ^ (lambda02 <= q[0] && q[0] <= lambda12)) {
      var q1 = cartesianScale(u, (-w + t) / uu);
      cartesianAddInPlace(q1, A);
      return [q, spherical(q1)];
    }
  }
  function code(lambda, phi) {
    var r = smallRadius ? radius : pi - radius,code2 = 0;
    if (lambda < -r)
    code2 |= 1;else
    if (lambda > r)
    code2 |= 2;
    if (phi < -r)
    code2 |= 4;else
    if (phi > r)
    code2 |= 8;
    return code2;
  }
  return clip(visible, clipLine2, interpolate2, smallRadius ? [0, -radius] : [-pi, radius - pi]);
}
function clipLine(a, b, x02, y02, x12, y12) {
  var ax = a[0],ay = a[1],bx = b[0],by = b[1],t0 = 0,t1 = 1,dx = bx - ax,dy = by - ay,r;
  r = x02 - ax;
  if (!dx && r > 0)
  return;
  r /= dx;
  if (dx < 0) {
    if (r < t0)
    return;
    if (r < t1)
    t1 = r;
  } else if (dx > 0) {
    if (r > t1)
    return;
    if (r > t0)
    t0 = r;
  }
  r = x12 - ax;
  if (!dx && r < 0)
  return;
  r /= dx;
  if (dx < 0) {
    if (r > t1)
    return;
    if (r > t0)
    t0 = r;
  } else if (dx > 0) {
    if (r < t0)
    return;
    if (r < t1)
    t1 = r;
  }
  r = y02 - ay;
  if (!dy && r > 0)
  return;
  r /= dy;
  if (dy < 0) {
    if (r < t0)
    return;
    if (r < t1)
    t1 = r;
  } else if (dy > 0) {
    if (r > t1)
    return;
    if (r > t0)
    t0 = r;
  }
  r = y12 - ay;
  if (!dy && r < 0)
  return;
  r /= dy;
  if (dy < 0) {
    if (r > t1)
    return;
    if (r > t0)
    t0 = r;
  } else if (dy > 0) {
    if (r < t0)
    return;
    if (r < t1)
    t1 = r;
  }
  if (t0 > 0)
  a[0] = ax + t0 * dx, a[1] = ay + t0 * dy;
  if (t1 < 1)
  b[0] = ax + t1 * dx, b[1] = ay + t1 * dy;
  return true;
}
var clipMax = 1e9,clipMin = -clipMax;
function clipRectangle(x02, y02, x12, y12) {
  function visible(x, y) {
    return x02 <= x && x <= x12 && y02 <= y && y <= y12;
  }
  function interpolate2(from, to, direction, stream) {
    var a = 0,a1 = 0;
    if (from == null || (a = corner(from, direction)) !== (a1 = corner(to, direction)) || comparePoint(from, to) < 0 ^ direction > 0) {
      do
      stream.point(a === 0 || a === 3 ? x02 : x12, a > 1 ? y12 : y02); while (
      (a = (a + direction + 4) % 4) !== a1);
    } else {
      stream.point(to[0], to[1]);
    }
  }
  function corner(p, direction) {
    return abs(p[0] - x02) < epsilon ? direction > 0 ? 0 : 3 : abs(p[0] - x12) < epsilon ? direction > 0 ? 2 : 1 : abs(p[1] - y02) < epsilon ? direction > 0 ? 1 : 0 : direction > 0 ? 3 : 2;
  }
  function compareIntersection2(a, b) {
    return comparePoint(a.x, b.x);
  }
  function comparePoint(a, b) {
    var ca = corner(a, 1),cb = corner(b, 1);
    return ca !== cb ? ca - cb : ca === 0 ? b[1] - a[1] : ca === 1 ? a[0] - b[0] : ca === 2 ? a[1] - b[1] : b[0] - a[0];
  }
  return function (stream) {
    var activeStream = stream,bufferStream = clipBuffer(),segments,polygon,ring,x__,y__,v__,x_,y_,v_,first,clean;
    var clipStream = {
      point,
      lineStart,
      lineEnd,
      polygonStart,
      polygonEnd
    };
    function point(x, y) {
      if (visible(x, y))
      activeStream.point(x, y);
    }
    function polygonInside() {
      var winding = 0;
      for (var i = 0, n = polygon.length; i < n; ++i) {
        for (var ring2 = polygon[i], j = 1, m = ring2.length, point2 = ring2[0], a0, a1, b0 = point2[0], b1 = point2[1]; j < m; ++j) {
          a0 = b0, a1 = b1, point2 = ring2[j], b0 = point2[0], b1 = point2[1];
          if (a1 <= y12) {
            if (b1 > y12 && (b0 - a0) * (y12 - a1) > (b1 - a1) * (x02 - a0))
            ++winding;
          } else {
            if (b1 <= y12 && (b0 - a0) * (y12 - a1) < (b1 - a1) * (x02 - a0))
            --winding;
          }
        }
      }
      return winding;
    }
    function polygonStart() {
      activeStream = bufferStream, segments = [], polygon = [], clean = true;
    }
    function polygonEnd() {
      var startInside = polygonInside(),cleanInside = clean && startInside,visible2 = (segments = merge(segments)).length;
      if (cleanInside || visible2) {
        stream.polygonStart();
        if (cleanInside) {
          stream.lineStart();
          interpolate2(null, null, 1, stream);
          stream.lineEnd();
        }
        if (visible2) {
          clipRejoin(segments, compareIntersection2, startInside, interpolate2, stream);
        }
        stream.polygonEnd();
      }
      activeStream = stream, segments = polygon = ring = null;
    }
    function lineStart() {
      clipStream.point = linePoint2;
      if (polygon)
      polygon.push(ring = []);
      first = true;
      v_ = false;
      x_ = y_ = NaN;
    }
    function lineEnd() {
      if (segments) {
        linePoint2(x__, y__);
        if (v__ && v_)
        bufferStream.rejoin();
        segments.push(bufferStream.result());
      }
      clipStream.point = point;
      if (v_)
      activeStream.lineEnd();
    }
    function linePoint2(x, y) {
      var v = visible(x, y);
      if (polygon)
      ring.push([x, y]);
      if (first) {
        x__ = x, y__ = y, v__ = v;
        first = false;
        if (v) {
          activeStream.lineStart();
          activeStream.point(x, y);
        }
      } else {
        if (v && v_)
        activeStream.point(x, y);else
        {
          var a = [x_ = Math.max(clipMin, Math.min(clipMax, x_)), y_ = Math.max(clipMin, Math.min(clipMax, y_))],b = [x = Math.max(clipMin, Math.min(clipMax, x)), y = Math.max(clipMin, Math.min(clipMax, y))];
          if (clipLine(a, b, x02, y02, x12, y12)) {
            if (!v_) {
              activeStream.lineStart();
              activeStream.point(a[0], a[1]);
            }
            activeStream.point(b[0], b[1]);
            if (!v)
            activeStream.lineEnd();
            clean = false;
          } else if (v) {
            activeStream.lineStart();
            activeStream.point(x, y);
            clean = false;
          }
        }
      }
      x_ = x, y_ = y, v_ = v;
    }
    return clipStream;
  };
}
var lengthSum, lambda0$2, sinPhi0$1, cosPhi0$1;
var lengthStream = {
  sphere: noop,
  point: noop,
  lineStart: lengthLineStart,
  lineEnd: noop,
  polygonStart: noop,
  polygonEnd: noop
};
function lengthLineStart() {
  lengthStream.point = lengthPointFirst;
  lengthStream.lineEnd = lengthLineEnd;
}
function lengthLineEnd() {
  lengthStream.point = lengthStream.lineEnd = noop;
}
function lengthPointFirst(lambda, phi) {
  lambda *= radians$1, phi *= radians$1;
  lambda0$2 = lambda, sinPhi0$1 = sin$1(phi), cosPhi0$1 = cos$1(phi);
  lengthStream.point = lengthPoint;
}
function lengthPoint(lambda, phi) {
  lambda *= radians$1, phi *= radians$1;
  var sinPhi = sin$1(phi),cosPhi = cos$1(phi),delta = abs(lambda - lambda0$2),cosDelta = cos$1(delta),sinDelta = sin$1(delta),x = cosPhi * sinDelta,y = cosPhi0$1 * sinPhi - sinPhi0$1 * cosPhi * cosDelta,z = sinPhi0$1 * sinPhi + cosPhi0$1 * cosPhi * cosDelta;
  lengthSum.add(atan2$1(sqrt(x * x + y * y), z));
  lambda0$2 = lambda, sinPhi0$1 = sinPhi, cosPhi0$1 = cosPhi;
}
function length(object2) {
  lengthSum = new Adder();
  geoStream(object2, lengthStream);
  return +lengthSum;
}
var coordinates = [null, null],object$1 = { type: "LineString", coordinates };
function distance(a, b) {
  coordinates[0] = a;
  coordinates[1] = b;
  return length(object$1);
}
function graticuleX(y02, y12, dy) {
  var y = range(y02, y12 - epsilon, dy).concat(y12);
  return function (x) {
    return y.map(function (y2) {
      return [x, y2];
    });
  };
}
function graticuleY(x02, x12, dx) {
  var x = range(x02, x12 - epsilon, dx).concat(x12);
  return function (y) {
    return x.map(function (x2) {
      return [x2, y];
    });
  };
}
function graticule() {
  var x12,x02,X12,X02,y12,y02,Y12,Y02,dx = 10,dy = dx,DX = 90,DY = 360,x,y,X,Y,precision = 2.5;
  function graticule2() {
    return { type: "MultiLineString", coordinates: lines() };
  }
  function lines() {
    return range(ceil(X02 / DX) * DX, X12, DX).map(X).concat(range(ceil(Y02 / DY) * DY, Y12, DY).map(Y)).concat(range(ceil(x02 / dx) * dx, x12, dx).filter(function (x2) {
      return abs(x2 % DX) > epsilon;
    }).map(x)).concat(range(ceil(y02 / dy) * dy, y12, dy).filter(function (y2) {
      return abs(y2 % DY) > epsilon;
    }).map(y));
  }
  graticule2.lines = function () {
    return lines().map(function (coordinates2) {
      return { type: "LineString", coordinates: coordinates2 };
    });
  };
  graticule2.outline = function () {
    return {
      type: "Polygon",
      coordinates: [
      X(X02).concat(Y(Y12).slice(1), X(X12).reverse().slice(1), Y(Y02).reverse().slice(1))]

    };
  };
  graticule2.extent = function (_) {
    if (!arguments.length)
    return graticule2.extentMinor();
    return graticule2.extentMajor(_).extentMinor(_);
  };
  graticule2.extentMajor = function (_) {
    if (!arguments.length)
    return [[X02, Y02], [X12, Y12]];
    X02 = +_[0][0], X12 = +_[1][0];
    Y02 = +_[0][1], Y12 = +_[1][1];
    if (X02 > X12)
    _ = X02, X02 = X12, X12 = _;
    if (Y02 > Y12)
    _ = Y02, Y02 = Y12, Y12 = _;
    return graticule2.precision(precision);
  };
  graticule2.extentMinor = function (_) {
    if (!arguments.length)
    return [[x02, y02], [x12, y12]];
    x02 = +_[0][0], x12 = +_[1][0];
    y02 = +_[0][1], y12 = +_[1][1];
    if (x02 > x12)
    _ = x02, x02 = x12, x12 = _;
    if (y02 > y12)
    _ = y02, y02 = y12, y12 = _;
    return graticule2.precision(precision);
  };
  graticule2.step = function (_) {
    if (!arguments.length)
    return graticule2.stepMinor();
    return graticule2.stepMajor(_).stepMinor(_);
  };
  graticule2.stepMajor = function (_) {
    if (!arguments.length)
    return [DX, DY];
    DX = +_[0], DY = +_[1];
    return graticule2;
  };
  graticule2.stepMinor = function (_) {
    if (!arguments.length)
    return [dx, dy];
    dx = +_[0], dy = +_[1];
    return graticule2;
  };
  graticule2.precision = function (_) {
    if (!arguments.length)
    return precision;
    precision = +_;
    x = graticuleX(y02, y12, 90);
    y = graticuleY(x02, x12, precision);
    X = graticuleX(Y02, Y12, 90);
    Y = graticuleY(X02, X12, precision);
    return graticule2;
  };
  return graticule2.extentMajor([[-180, -90 + epsilon], [180, 90 - epsilon]]).extentMinor([[-180, -80 - epsilon], [180, 80 + epsilon]]);
}
function interpolate(a, b) {
  var x02 = a[0] * radians$1,y02 = a[1] * radians$1,x12 = b[0] * radians$1,y12 = b[1] * radians$1,cy0 = cos$1(y02),sy0 = sin$1(y02),cy1 = cos$1(y12),sy1 = sin$1(y12),kx0 = cy0 * cos$1(x02),ky0 = cy0 * sin$1(x02),kx1 = cy1 * cos$1(x12),ky1 = cy1 * sin$1(x12),d = 2 * asin$1(sqrt(haversin(y12 - y02) + cy0 * cy1 * haversin(x12 - x02))),k = sin$1(d);
  var interpolate2 = d ? function (t) {
    var B = sin$1(t *= d) / k,A = sin$1(d - t) / k,x = A * kx0 + B * kx1,y = A * ky0 + B * ky1,z = A * sy0 + B * sy1;
    return [
    atan2$1(y, x) * degrees$1,
    atan2$1(z, sqrt(x * x + y * y)) * degrees$1];

  } : function () {
    return [x02 * degrees$1, y02 * degrees$1];
  };
  interpolate2.distance = d;
  return interpolate2;
}
var identity$1 = (x) => x;
var areaSum$1 = new Adder(),areaRingSum$1 = new Adder(),x00,y00,x0$1,y0$1;
var areaStream$1 = {
  point: noop,
  lineStart: noop,
  lineEnd: noop,
  polygonStart: function () {
    areaStream$1.lineStart = areaRingStart$1;
    areaStream$1.lineEnd = areaRingEnd$1;
  },
  polygonEnd: function () {
    areaStream$1.lineStart = areaStream$1.lineEnd = areaStream$1.point = noop;
    areaSum$1.add(abs(areaRingSum$1));
    areaRingSum$1 = new Adder();
  },
  result: function () {
    var area2 = areaSum$1 / 2;
    areaSum$1 = new Adder();
    return area2;
  }
};
function areaRingStart$1() {
  areaStream$1.point = areaPointFirst$1;
}
function areaPointFirst$1(x, y) {
  areaStream$1.point = areaPoint$1;
  x00 = x0$1 = x, y00 = y0$1 = y;
}
function areaPoint$1(x, y) {
  areaRingSum$1.add(y0$1 * x - x0$1 * y);
  x0$1 = x, y0$1 = y;
}
function areaRingEnd$1() {
  areaPoint$1(x00, y00);
}
var x0$2 = Infinity,y0$2 = x0$2,x1 = -x0$2,y1 = x1;
var boundsStream$1 = {
  point: boundsPoint$1,
  lineStart: noop,
  lineEnd: noop,
  polygonStart: noop,
  polygonEnd: noop,
  result: function () {
    var bounds2 = [[x0$2, y0$2], [x1, y1]];
    x1 = y1 = -(y0$2 = x0$2 = Infinity);
    return bounds2;
  }
};
function boundsPoint$1(x, y) {
  if (x < x0$2)
  x0$2 = x;
  if (x > x1)
  x1 = x;
  if (y < y0$2)
  y0$2 = y;
  if (y > y1)
  y1 = y;
}
var X0$1 = 0,Y0$1 = 0,Z0$1 = 0,X1$1 = 0,Y1$1 = 0,Z1$1 = 0,X2$1 = 0,Y2$1 = 0,Z2$1 = 0,x00$1,y00$1,x0$3,y0$3;
var centroidStream$1 = {
  point: centroidPoint$1,
  lineStart: centroidLineStart$1,
  lineEnd: centroidLineEnd$1,
  polygonStart: function () {
    centroidStream$1.lineStart = centroidRingStart$1;
    centroidStream$1.lineEnd = centroidRingEnd$1;
  },
  polygonEnd: function () {
    centroidStream$1.point = centroidPoint$1;
    centroidStream$1.lineStart = centroidLineStart$1;
    centroidStream$1.lineEnd = centroidLineEnd$1;
  },
  result: function () {
    var centroid2 = Z2$1 ? [X2$1 / Z2$1, Y2$1 / Z2$1] : Z1$1 ? [X1$1 / Z1$1, Y1$1 / Z1$1] : Z0$1 ? [X0$1 / Z0$1, Y0$1 / Z0$1] : [NaN, NaN];
    X0$1 = Y0$1 = Z0$1 = X1$1 = Y1$1 = Z1$1 = X2$1 = Y2$1 = Z2$1 = 0;
    return centroid2;
  }
};
function centroidPoint$1(x, y) {
  X0$1 += x;
  Y0$1 += y;
  ++Z0$1;
}
function centroidLineStart$1() {
  centroidStream$1.point = centroidPointFirstLine;
}
function centroidPointFirstLine(x, y) {
  centroidStream$1.point = centroidPointLine;
  centroidPoint$1(x0$3 = x, y0$3 = y);
}
function centroidPointLine(x, y) {
  var dx = x - x0$3,dy = y - y0$3,z = sqrt(dx * dx + dy * dy);
  X1$1 += z * (x0$3 + x) / 2;
  Y1$1 += z * (y0$3 + y) / 2;
  Z1$1 += z;
  centroidPoint$1(x0$3 = x, y0$3 = y);
}
function centroidLineEnd$1() {
  centroidStream$1.point = centroidPoint$1;
}
function centroidRingStart$1() {
  centroidStream$1.point = centroidPointFirstRing;
}
function centroidRingEnd$1() {
  centroidPointRing(x00$1, y00$1);
}
function centroidPointFirstRing(x, y) {
  centroidStream$1.point = centroidPointRing;
  centroidPoint$1(x00$1 = x0$3 = x, y00$1 = y0$3 = y);
}
function centroidPointRing(x, y) {
  var dx = x - x0$3,dy = y - y0$3,z = sqrt(dx * dx + dy * dy);
  X1$1 += z * (x0$3 + x) / 2;
  Y1$1 += z * (y0$3 + y) / 2;
  Z1$1 += z;
  z = y0$3 * x - x0$3 * y;
  X2$1 += z * (x0$3 + x);
  Y2$1 += z * (y0$3 + y);
  Z2$1 += z * 3;
  centroidPoint$1(x0$3 = x, y0$3 = y);
}
function PathContext(context) {
  this._context = context;
}
PathContext.prototype = {
  _radius: 4.5,
  pointRadius: function (_) {
    return this._radius = _, this;
  },
  polygonStart: function () {
    this._line = 0;
  },
  polygonEnd: function () {
    this._line = NaN;
  },
  lineStart: function () {
    this._point = 0;
  },
  lineEnd: function () {
    if (this._line === 0)
    this._context.closePath();
    this._point = NaN;
  },
  point: function (x, y) {
    switch (this._point) {
      case 0:{
          this._context.moveTo(x, y);
          this._point = 1;
          break;
        }
      case 1:{
          this._context.lineTo(x, y);
          break;
        }
      default:{
          this._context.moveTo(x + this._radius, y);
          this._context.arc(x, y, this._radius, 0, tau);
          break;
        }}

  },
  result: noop
};
var lengthSum$1 = new Adder(),lengthRing,x00$2,y00$2,x0$4,y0$4;
var lengthStream$1 = {
  point: noop,
  lineStart: function () {
    lengthStream$1.point = lengthPointFirst$1;
  },
  lineEnd: function () {
    if (lengthRing)
    lengthPoint$1(x00$2, y00$2);
    lengthStream$1.point = noop;
  },
  polygonStart: function () {
    lengthRing = true;
  },
  polygonEnd: function () {
    lengthRing = null;
  },
  result: function () {
    var length2 = +lengthSum$1;
    lengthSum$1 = new Adder();
    return length2;
  }
};
function lengthPointFirst$1(x, y) {
  lengthStream$1.point = lengthPoint$1;
  x00$2 = x0$4 = x, y00$2 = y0$4 = y;
}
function lengthPoint$1(x, y) {
  x0$4 -= x, y0$4 -= y;
  lengthSum$1.add(sqrt(x0$4 * x0$4 + y0$4 * y0$4));
  x0$4 = x, y0$4 = y;
}
let cacheDigits, cacheAppend, cacheRadius, cacheCircle;
class PathString {
  constructor(digits) {
    this._append = digits == null ? append : appendRound(digits);
    this._radius = 4.5;
    this._ = "";
  }
  pointRadius(_) {
    this._radius = +_;
    return this;
  }
  polygonStart() {
    this._line = 0;
  }
  polygonEnd() {
    this._line = NaN;
  }
  lineStart() {
    this._point = 0;
  }
  lineEnd() {
    if (this._line === 0)
    this._ += "Z";
    this._point = NaN;
  }
  point(x, y) {
    switch (this._point) {
      case 0:{
          this._append`M${x},${y}`;
          this._point = 1;
          break;
        }
      case 1:{
          this._append`L${x},${y}`;
          break;
        }
      default:{
          this._append`M${x},${y}`;
          if (this._radius !== cacheRadius || this._append !== cacheAppend) {
            const r = this._radius;
            const s = this._;
            this._ = "";
            this._append`m0,${r}a${r},${r} 0 1,1 0,${-2 * r}a${r},${r} 0 1,1 0,${2 * r}z`;
            cacheRadius = r;
            cacheAppend = this._append;
            cacheCircle = this._;
            this._ = s;
          }
          this._ += cacheCircle;
          break;
        }}

  }
  result() {
    const result = this._;
    this._ = "";
    return result.length ? result : null;
  }
}
function append(strings) {
  let i = 1;
  this._ += strings[0];
  for (const j = strings.length; i < j; ++i) {
    this._ += arguments[i] + strings[i];
  }
}
function appendRound(digits) {
  const d = Math.floor(digits);
  if (!(d >= 0))
  throw new RangeError(`invalid digits: ${digits}`);
  if (d > 15)
  return append;
  if (d !== cacheDigits) {
    const k = 10 ** d;
    cacheDigits = d;
    cacheAppend = function append2(strings) {
      let i = 1;
      this._ += strings[0];
      for (const j = strings.length; i < j; ++i) {
        this._ += Math.round(arguments[i] * k) / k + strings[i];
      }
    };
  }
  return cacheAppend;
}
function index(projection2, context) {
  let digits = 3,pointRadius = 4.5,projectionStream,contextStream;
  function path(object2) {
    if (object2) {
      if (typeof pointRadius === "function")
      contextStream.pointRadius(+pointRadius.apply(this, arguments));
      geoStream(object2, projectionStream(contextStream));
    }
    return contextStream.result();
  }
  path.area = function (object2) {
    geoStream(object2, projectionStream(areaStream$1));
    return areaStream$1.result();
  };
  path.measure = function (object2) {
    geoStream(object2, projectionStream(lengthStream$1));
    return lengthStream$1.result();
  };
  path.bounds = function (object2) {
    geoStream(object2, projectionStream(boundsStream$1));
    return boundsStream$1.result();
  };
  path.centroid = function (object2) {
    geoStream(object2, projectionStream(centroidStream$1));
    return centroidStream$1.result();
  };
  path.projection = function (_) {
    if (!arguments.length)
    return projection2;
    projectionStream = _ == null ? (projection2 = null, identity$1) : (projection2 = _).stream;
    return path;
  };
  path.context = function (_) {
    if (!arguments.length)
    return context;
    contextStream = _ == null ? (context = null, new PathString(digits)) : new PathContext(context = _);
    if (typeof pointRadius !== "function")
    contextStream.pointRadius(pointRadius);
    return path;
  };
  path.pointRadius = function (_) {
    if (!arguments.length)
    return pointRadius;
    pointRadius = typeof _ === "function" ? _ : (contextStream.pointRadius(+_), +_);
    return path;
  };
  path.digits = function (_) {
    if (!arguments.length)
    return digits;
    if (_ == null)
    digits = null;else
    {
      const d = Math.floor(_);
      if (!(d >= 0))
      throw new RangeError(`invalid digits: ${_}`);
      digits = d;
    }
    if (context === null)
    contextStream = new PathString(digits);
    return path;
  };
  return path.projection(projection2).digits(digits).context(context);
}
function transformer(methods) {
  return function (stream) {
    var s = new TransformStream();
    for (var key in methods)
    s[key] = methods[key];
    s.stream = stream;
    return s;
  };
}
function TransformStream() {
}
TransformStream.prototype = {
  constructor: TransformStream,
  point: function (x, y) {
    this.stream.point(x, y);
  },
  sphere: function () {
    this.stream.sphere();
  },
  lineStart: function () {
    this.stream.lineStart();
  },
  lineEnd: function () {
    this.stream.lineEnd();
  },
  polygonStart: function () {
    this.stream.polygonStart();
  },
  polygonEnd: function () {
    this.stream.polygonEnd();
  }
};
function fit(projection2, fitBounds, object2) {
  var clip2 = projection2.clipExtent && projection2.clipExtent();
  projection2.scale(150).translate([0, 0]);
  if (clip2 != null)
  projection2.clipExtent(null);
  geoStream(object2, projection2.stream(boundsStream$1));
  fitBounds(boundsStream$1.result());
  if (clip2 != null)
  projection2.clipExtent(clip2);
  return projection2;
}
function fitExtent(projection2, extent2, object2) {
  return fit(projection2, function (b) {
    var w = extent2[1][0] - extent2[0][0],h = extent2[1][1] - extent2[0][1],k = Math.min(w / (b[1][0] - b[0][0]), h / (b[1][1] - b[0][1])),x = +extent2[0][0] + (w - k * (b[1][0] + b[0][0])) / 2,y = +extent2[0][1] + (h - k * (b[1][1] + b[0][1])) / 2;
    projection2.scale(150 * k).translate([x, y]);
  }, object2);
}
function fitSize(projection2, size, object2) {
  return fitExtent(projection2, [[0, 0], size], object2);
}
function fitWidth(projection2, width, object2) {
  return fit(projection2, function (b) {
    var w = +width,k = w / (b[1][0] - b[0][0]),x = (w - k * (b[1][0] + b[0][0])) / 2,y = -k * b[0][1];
    projection2.scale(150 * k).translate([x, y]);
  }, object2);
}
function fitHeight(projection2, height, object2) {
  return fit(projection2, function (b) {
    var h = +height,k = h / (b[1][1] - b[0][1]),x = -k * b[0][0],y = (h - k * (b[1][1] + b[0][1])) / 2;
    projection2.scale(150 * k).translate([x, y]);
  }, object2);
}
var maxDepth = 16,cosMinDistance = cos$1(30 * radians$1);
function resample(project, delta2) {
  return +delta2 ? resample$1(project, delta2) : resampleNone(project);
}
function resampleNone(project) {
  return transformer({
    point: function (x, y) {
      x = project(x, y);
      this.stream.point(x[0], x[1]);
    }
  });
}
function resample$1(project, delta2) {
  function resampleLineTo(x02, y02, lambda02, a0, b0, c0, x12, y12, lambda12, a1, b1, c1, depth, stream) {
    var dx = x12 - x02,dy = y12 - y02,d2 = dx * dx + dy * dy;
    if (d2 > 4 * delta2 && depth--) {
      var a = a0 + a1,b = b0 + b1,c = c0 + c1,m = sqrt(a * a + b * b + c * c),phi2 = asin$1(c /= m),lambda22 = abs(abs(c) - 1) < epsilon || abs(lambda02 - lambda12) < epsilon ? (lambda02 + lambda12) / 2 : atan2$1(b, a),p = project(lambda22, phi2),x2 = p[0],y2 = p[1],dx2 = x2 - x02,dy2 = y2 - y02,dz = dy * dx2 - dx * dy2;
      if (dz * dz / d2 > delta2 || abs((dx * dx2 + dy * dy2) / d2 - 0.5) > 0.3 || a0 * a1 + b0 * b1 + c0 * c1 < cosMinDistance) {
        resampleLineTo(x02, y02, lambda02, a0, b0, c0, x2, y2, lambda22, a /= m, b /= m, c, depth, stream);
        stream.point(x2, y2);
        resampleLineTo(x2, y2, lambda22, a, b, c, x12, y12, lambda12, a1, b1, c1, depth, stream);
      }
    }
  }
  return function (stream) {
    var lambda002, x002, y002, a00, b00, c00, lambda02, x02, y02, a0, b0, c0;
    var resampleStream = {
      point,
      lineStart,
      lineEnd,
      polygonStart: function () {
        stream.polygonStart();
        resampleStream.lineStart = ringStart;
      },
      polygonEnd: function () {
        stream.polygonEnd();
        resampleStream.lineStart = lineStart;
      }
    };
    function point(x, y) {
      x = project(x, y);
      stream.point(x[0], x[1]);
    }
    function lineStart() {
      x02 = NaN;
      resampleStream.point = linePoint2;
      stream.lineStart();
    }
    function linePoint2(lambda, phi) {
      var c = cartesian([lambda, phi]),p = project(lambda, phi);
      resampleLineTo(x02, y02, lambda02, a0, b0, c0, x02 = p[0], y02 = p[1], lambda02 = lambda, a0 = c[0], b0 = c[1], c0 = c[2], maxDepth, stream);
      stream.point(x02, y02);
    }
    function lineEnd() {
      resampleStream.point = point;
      stream.lineEnd();
    }
    function ringStart() {
      lineStart();
      resampleStream.point = ringPoint;
      resampleStream.lineEnd = ringEnd;
    }
    function ringPoint(lambda, phi) {
      linePoint2(lambda002 = lambda, phi), x002 = x02, y002 = y02, a00 = a0, b00 = b0, c00 = c0;
      resampleStream.point = linePoint2;
    }
    function ringEnd() {
      resampleLineTo(x02, y02, lambda02, a0, b0, c0, x002, y002, lambda002, a00, b00, c00, maxDepth, stream);
      resampleStream.lineEnd = lineEnd;
      lineEnd();
    }
    return resampleStream;
  };
}
var transformRadians = transformer({
  point: function (x, y) {
    this.stream.point(x * radians$1, y * radians$1);
  }
});
function transformRotate(rotate) {
  return transformer({
    point: function (x, y) {
      var r = rotate(x, y);
      return this.stream.point(r[0], r[1]);
    }
  });
}
function scaleTranslate(k, dx, dy, sx, sy) {
  function transform2(x, y) {
    x *= sx;
    y *= sy;
    return [dx + k * x, dy - k * y];
  }
  transform2.invert = function (x, y) {
    return [(x - dx) / k * sx, (dy - y) / k * sy];
  };
  return transform2;
}
function scaleTranslateRotate(k, dx, dy, sx, sy, alpha) {
  if (!alpha)
  return scaleTranslate(k, dx, dy, sx, sy);
  var cosAlpha = cos$1(alpha),sinAlpha = sin$1(alpha),a = cosAlpha * k,b = sinAlpha * k,ai = cosAlpha / k,bi = sinAlpha / k,ci = (sinAlpha * dy - cosAlpha * dx) / k,fi = (sinAlpha * dx + cosAlpha * dy) / k;
  function transform2(x, y) {
    x *= sx;
    y *= sy;
    return [a * x - b * y + dx, dy - b * x - a * y];
  }
  transform2.invert = function (x, y) {
    return [sx * (ai * x - bi * y + ci), sy * (fi - bi * x - ai * y)];
  };
  return transform2;
}
function projection(project) {
  return projectionMutator(function () {
    return project;
  })();
}
function projectionMutator(projectAt) {
  var project,k = 150,x = 480,y = 250,lambda = 0,phi = 0,deltaLambda = 0,deltaPhi = 0,deltaGamma = 0,rotate,alpha = 0,sx = 1,sy = 1,theta = null,preclip = clipAntimeridian,x02 = null,y02,x12,y12,postclip = identity$1,delta2 = 0.5,projectResample,projectTransform,projectRotateTransform,cache,cacheStream;
  function projection2(point) {
    return projectRotateTransform(point[0] * radians$1, point[1] * radians$1);
  }
  function invert(point) {
    point = projectRotateTransform.invert(point[0], point[1]);
    return point && [point[0] * degrees$1, point[1] * degrees$1];
  }
  projection2.stream = function (stream) {
    return cache && cacheStream === stream ? cache : cache = transformRadians(transformRotate(rotate)(preclip(projectResample(postclip(cacheStream = stream)))));
  };
  projection2.preclip = function (_) {
    return arguments.length ? (preclip = _, theta = void 0, reset()) : preclip;
  };
  projection2.postclip = function (_) {
    return arguments.length ? (postclip = _, x02 = y02 = x12 = y12 = null, reset()) : postclip;
  };
  projection2.clipAngle = function (_) {
    return arguments.length ? (preclip = +_ ? clipCircle(theta = _ * radians$1) : (theta = null, clipAntimeridian), reset()) : theta * degrees$1;
  };
  projection2.clipExtent = function (_) {
    return arguments.length ? (postclip = _ == null ? (x02 = y02 = x12 = y12 = null, identity$1) : clipRectangle(x02 = +_[0][0], y02 = +_[0][1], x12 = +_[1][0], y12 = +_[1][1]), reset()) : x02 == null ? null : [[x02, y02], [x12, y12]];
  };
  projection2.scale = function (_) {
    return arguments.length ? (k = +_, recenter()) : k;
  };
  projection2.translate = function (_) {
    return arguments.length ? (x = +_[0], y = +_[1], recenter()) : [x, y];
  };
  projection2.center = function (_) {
    return arguments.length ? (lambda = _[0] % 360 * radians$1, phi = _[1] % 360 * radians$1, recenter()) : [lambda * degrees$1, phi * degrees$1];
  };
  projection2.rotate = function (_) {
    return arguments.length ? (deltaLambda = _[0] % 360 * radians$1, deltaPhi = _[1] % 360 * radians$1, deltaGamma = _.length > 2 ? _[2] % 360 * radians$1 : 0, recenter()) : [deltaLambda * degrees$1, deltaPhi * degrees$1, deltaGamma * degrees$1];
  };
  projection2.angle = function (_) {
    return arguments.length ? (alpha = _ % 360 * radians$1, recenter()) : alpha * degrees$1;
  };
  projection2.reflectX = function (_) {
    return arguments.length ? (sx = _ ? -1 : 1, recenter()) : sx < 0;
  };
  projection2.reflectY = function (_) {
    return arguments.length ? (sy = _ ? -1 : 1, recenter()) : sy < 0;
  };
  projection2.precision = function (_) {
    return arguments.length ? (projectResample = resample(projectTransform, delta2 = _ * _), reset()) : sqrt(delta2);
  };
  projection2.fitExtent = function (extent2, object2) {
    return fitExtent(projection2, extent2, object2);
  };
  projection2.fitSize = function (size, object2) {
    return fitSize(projection2, size, object2);
  };
  projection2.fitWidth = function (width, object2) {
    return fitWidth(projection2, width, object2);
  };
  projection2.fitHeight = function (height, object2) {
    return fitHeight(projection2, height, object2);
  };
  function recenter() {
    var center = scaleTranslateRotate(k, 0, 0, sx, sy, alpha).apply(null, project(lambda, phi)),transform2 = scaleTranslateRotate(k, x - center[0], y - center[1], sx, sy, alpha);
    rotate = rotateRadians(deltaLambda, deltaPhi, deltaGamma);
    projectTransform = compose(project, transform2);
    projectRotateTransform = compose(rotate, projectTransform);
    projectResample = resample(projectTransform, delta2);
    return reset();
  }
  function reset() {
    cache = cacheStream = null;
    return projection2;
  }
  return function () {
    project = projectAt.apply(this, arguments);
    projection2.invert = project.invert && invert;
    return recenter();
  };
}
function azimuthalInvert(angle2) {
  return function (x, y) {
    var z = sqrt(x * x + y * y),c = angle2(z),sc = sin$1(c),cc = cos$1(c);
    return [
    atan2$1(x * sc, z * cc),
    asin$1(z && y * sc / z)];

  };
}
function equirectangularRaw(lambda, phi) {
  return [lambda, phi];
}
equirectangularRaw.invert = equirectangularRaw;
function orthographicRaw(x, y) {
  return [cos$1(y) * sin$1(x), sin$1(y)];
}
orthographicRaw.invert = azimuthalInvert(asin$1);
function orthographic() {
  return projection(orthographicRaw).scale(249.5).clipAngle(90 + epsilon);
}

function ascending(a, b) {
  return a == null || b == null ? NaN : a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
}
function descending(a, b) {
  return a == null || b == null ? NaN : b < a ? -1 : b > a ? 1 : b >= a ? 0 : NaN;
}
function bisector(f) {
  let compare1, compare2, delta;
  if (f.length !== 2) {
    compare1 = ascending;
    compare2 = (d, x) => ascending(f(d), x);
    delta = (d, x) => f(d) - x;
  } else {
    compare1 = f === ascending || f === descending ? f : zero;
    compare2 = f;
    delta = f;
  }
  function left(a, x, lo = 0, hi = a.length) {
    if (lo < hi) {
      if (compare1(x, x) !== 0)
      return hi;
      do {
        const mid = lo + hi >>> 1;
        if (compare2(a[mid], x) < 0)
        lo = mid + 1;else

        hi = mid;
      } while (lo < hi);
    }
    return lo;
  }
  function right(a, x, lo = 0, hi = a.length) {
    if (lo < hi) {
      if (compare1(x, x) !== 0)
      return hi;
      do {
        const mid = lo + hi >>> 1;
        if (compare2(a[mid], x) <= 0)
        lo = mid + 1;else

        hi = mid;
      } while (lo < hi);
    }
    return lo;
  }
  function center(a, x, lo = 0, hi = a.length) {
    const i = left(a, x, lo, hi - 1);
    return i > lo && delta(a[i - 1], x) > -delta(a[i], x) ? i - 1 : i;
  }
  return { left, center, right };
}
function zero() {
  return 0;
}
function number(x) {
  return x === null ? NaN : +x;
}
const ascendingBisect = bisector(ascending);
ascendingBisect.right;
ascendingBisect.left;
bisector(number).center;

function identity(x) {
  return x;
}
function transform(transform2) {
  if (transform2 == null)
  return identity;
  var x0,y0,kx = transform2.scale[0],ky = transform2.scale[1],dx = transform2.translate[0],dy = transform2.translate[1];
  return function (input, i) {
    if (!i)
    x0 = y0 = 0;
    var j = 2,n = input.length,output = new Array(n);
    output[0] = (x0 += input[0]) * kx + dx;
    output[1] = (y0 += input[1]) * ky + dy;
    while (j < n)
    output[j] = input[j], ++j;
    return output;
  };
}
function reverse(array, n) {
  var t,j = array.length,i = j - n;
  while (i < --j)
  t = array[i], array[i++] = array[j], array[j] = t;
}
function feature(topology, o) {
  if (typeof o === "string")
  o = topology.objects[o];
  return o.type === "GeometryCollection" ? { type: "FeatureCollection", features: o.geometries.map(function (o2) {
      return feature$1(topology, o2);
    }) } : feature$1(topology, o);
}
function feature$1(topology, o) {
  var id = o.id,bbox2 = o.bbox,properties = o.properties == null ? {} : o.properties,geometry = object(topology, o);
  return id == null && bbox2 == null ? { type: "Feature", properties, geometry } : bbox2 == null ? { type: "Feature", id, properties, geometry } : { type: "Feature", id, bbox: bbox2, properties, geometry };
}
function object(topology, o) {
  var transformPoint = transform(topology.transform),arcs = topology.arcs;
  function arc(i, points) {
    if (points.length)
    points.pop();
    for (var a = arcs[i < 0 ? ~i : i], k = 0, n = a.length; k < n; ++k) {
      points.push(transformPoint(a[k], k));
    }
    if (i < 0)
    reverse(points, n);
  }
  function point(p) {
    return transformPoint(p);
  }
  function line(arcs2) {
    var points = [];
    for (var i = 0, n = arcs2.length; i < n; ++i)
    arc(arcs2[i], points);
    if (points.length < 2)
    points.push(points[0]);
    return points;
  }
  function ring(arcs2) {
    var points = line(arcs2);
    while (points.length < 4)
    points.push(points[0]);
    return points;
  }
  function polygon(arcs2) {
    return arcs2.map(ring);
  }
  function geometry(o2) {
    var type = o2.type,coordinates;
    switch (type) {
      case "GeometryCollection":
        return { type, geometries: o2.geometries.map(geometry) };
      case "Point":
        coordinates = point(o2.coordinates);
        break;
      case "MultiPoint":
        coordinates = o2.coordinates.map(point);
        break;
      case "LineString":
        coordinates = line(o2.arcs);
        break;
      case "MultiLineString":
        coordinates = o2.arcs.map(line);
        break;
      case "Polygon":
        coordinates = polygon(o2.arcs);
        break;
      case "MultiPolygon":
        coordinates = o2.arcs.map(polygon);
        break;
      default:
        return null;}

    return { type, coordinates };
  }
  return geometry(o);
}

const acos = Math.acos,asin = Math.asin,atan2 = Math.atan2,cos = Math.cos,hypot = Math.hypot,max = Math.max,min = Math.min,PI = Math.PI,sin = Math.sin,radians = PI / 180,degrees = 180 / PI;
class Versor {
  static fromCartesian([x, y, z]) {
    return [0, z, -y, x];
  }
  static fromAngles([l, p, g]) {
    l *= radians / 2;
    p *= radians / 2;
    g = (g || 0) * radians / 2;
    const sl = sin(l),cl = cos(l);
    const sp = sin(p),cp = cos(p);
    const sg = sin(g),cg = cos(g);
    return [
    cl * cp * cg + sl * sp * sg,
    sl * cp * cg - cl * sp * sg,
    cl * sp * cg + sl * cp * sg,
    cl * cp * sg - sl * sp * cg];

  }
  static toAngles([a, b, c, d]) {
    return [
    atan2(2 * (a * b + c * d), 1 - 2 * (b * b + c * c)) * degrees,
    asin(max(-1, min(1, 2 * (a * c - d * b)))) * degrees,
    atan2(2 * (a * d + b * c), 1 - 2 * (c * c + d * d)) * degrees];

  }
  static interpolateAngles(a, b) {
    const i = Versor.interpolate(Versor.fromAngles(a), Versor.fromAngles(b));
    return (t) => Versor.toAngles(i(t));
  }
  static interpolateLinear([a1, b1, c1, d1], [a2, b2, c2, d2]) {
    a2 -= a1, b2 -= b1, c2 -= c1, d2 -= d1;
    const x = new Array(4);
    return (t) => {
      const l = hypot(x[0] = a1 + a2 * t, x[1] = b1 + b2 * t, x[2] = c1 + c2 * t, x[3] = d1 + d2 * t);
      x[0] /= l, x[1] /= l, x[2] /= l, x[3] /= l;
      return x;
    };
  }
  static interpolate([a1, b1, c1, d1], [a2, b2, c2, d2]) {
    let dot = Versor.dot([a1, b1, c1, d1], [a2, b2, c2, d2]);
    if (dot < 0)
    a2 = -a2, b2 = -b2, c2 = -c2, d2 = -d2, dot = -dot;
    if (dot > 0.9995)
    return Versor.interpolateLinear([a1, b1, c1, d1], [a2, b2, c2, d2]);
    const theta0 = acos(max(-1, min(1, dot)));
    const x = new Array(4);
    const l = hypot(a2 -= a1 * dot, b2 -= b1 * dot, c2 -= c1 * dot, d2 -= d1 * dot);
    a2 /= l, b2 /= l, c2 /= l, d2 /= l;
    return (t) => {
      const theta = theta0 * t;
      const s = sin(theta);
      const c = cos(theta);
      x[0] = a1 * c + a2 * s;
      x[1] = b1 * c + b2 * s;
      x[2] = c1 * c + c2 * s;
      x[3] = d1 * c + d2 * s;
      return x;
    };
  }
  static dot([a1, b1, c1, d1], [a2, b2, c2, d2]) {
    return a1 * a2 + b1 * b2 + c1 * c2 + d1 * d2;
  }
  static multiply([a1, b1, c1, d1], [a2, b2, c2, d2]) {
    return [
    a1 * a2 - b1 * b2 - c1 * c2 - d1 * d2,
    a1 * b2 + b1 * a2 + c1 * d2 - d1 * c2,
    a1 * c2 - b1 * d2 + c1 * a2 + d1 * b2,
    a1 * d2 + b1 * c2 - c1 * b2 + d1 * a2];

  }
}
const versor = Versor.fromAngles;
versor.multiply = Versor.multiply;
versor.rotation = Versor.toAngles;
versor.interpolate = Versor.interpolateAngles;
versor.cartesian = function (e) {
  const l = e[0] * radians,p = e[1] * radians,cp = cos(p);
  return [cp * cos(l), cp * sin(l), sin(p)];
};
versor.delta = function (v0, v1, alpha) {
  if (arguments.length == 2)
  alpha = 1;
  const sqrt = Math.sqrt;
  function cross(v02, v12) {
    return [v02[1] * v12[2] - v02[2] * v12[1], v02[2] * v12[0] - v02[0] * v12[2], v02[0] * v12[1] - v02[1] * v12[0]];
  }
  function dot(v02, v12) {
    return v02[0] * v12[0] + v02[1] * v12[1] + v02[2] * v12[2];
  }
  const w = cross(v0, v1),l = sqrt(dot(w, w));
  if (!l)
  return [1, 0, 0, 0];
  const t = alpha * acos(max(-1, min(1, dot(v0, v1)))) / 2,s = sin(t);
  return [cos(t), w[2] / l * s, -w[1] / l * s, w[0] / l * s];
};

function roundValues(el, round) {
  Object.keys(el.values).forEach((key) => el.values[key] = el.values[key] && parseFloat(el.values[key].toFixed(round)));
  return el;
}
function getPreviousNoZ(e, i, a) {
  const counter = i - 1;
  const previous = a[mod(counter, a.length)];
  if (previous.marker !== "Z") {
    return previous;
  } else {
    return getPreviousNoZ(e, counter, a);
  }
}
function getNextNoZ(e, i, a) {
  const counter = i + 1;
  const next = a[mod(counter, a.length)];
  if (next.marker === "Z") {
    return getNextNoZ(e, counter, a);
  } else {
    return next;
  }
}
function convertToAbsolute(el, index, arr) {
  let prev = arr[index - 1] || { values: { x: 0, y: 0 } };
  if (el.marker === el.marker.toLowerCase()) {
    el.marker = el.marker.toUpperCase();
    switch (el.marker) {
      case "M":
        el.values.x += prev.values.x;
        el.values.y += prev.values.y;
        break;
      case "L":
      case "A":
        el.values.x += prev.values.x;
        el.values.y += prev.values.y;
        break;
      case "H":
        el.marker = "L";
        el.values.x += prev.values.x;
        el.values.y = prev.values.y;
        break;
      case "V":
        el.marker = "L";
        el.values.x = prev.values.x;
        el.values.y += prev.values.y;
        break;
      case "C":
        el.values.x += prev.values.x;
        el.values.y += prev.values.y;
        el.values.x1 += prev.values.x;
        el.values.y1 += prev.values.y;
        el.values.x2 += prev.values.x;
        el.values.y2 += prev.values.y;
        break;
      case "S":
        el.values.x += prev.values.x;
        el.values.y += prev.values.y;
        el.values.x2 += prev.values.x;
        el.values.y2 += prev.values.y;
        break;
      case "Q":
        el.values.x += prev.values.x;
        el.values.y += prev.values.y;
        el.values.x1 += prev.values.x;
        el.values.y1 += prev.values.y;
        break;
      case "T":
        el.values.x += prev.values.x;
        el.values.y += prev.values.y;
        break;}

  } else if (el.marker === el.marker.toUpperCase()) {
    switch (el.marker) {
      case "H":
        el.marker = "L";
        el.values.y = prev.values.y;
        break;
      case "V":
        el.marker = "L";
        el.values.x = prev.values.x;
        break;}

  }
  if (el.marker === "Z") {
    function rec(arr2, i) {
      if (arr2[i].marker === "M") {
        return arr2[i];
      } else {
        return rec(arr2, i - 1);
      }
    }
    let mBefore = rec(arr, index);
    el.values.x = mBefore.values.x;
    el.values.y = mBefore.values.y;
  }
  return el;
}
function newCommands(marker, values) {
  const cmds = [];
  switch (marker.toUpperCase()) {
    case "M":
      for (let i = 0; i < values.length; i += 2) {
        let m;
        if (marker === marker.toUpperCase()) {
          m = i === 0 ? "M" : "L";
        } else {
          m = i === 0 ? "m" : "l";
        }
        cmds.push({
          marker: m,
          values: {
            x: values[i],
            y: values[i + 1]
          }
        });
      }
      break;
    case "L":
      for (let i = 0; i < values.length; i += 2) {
        cmds.push({
          marker,
          values: {
            x: values[i],
            y: values[i + 1]
          }
        });
      }
      break;
    case "H":
      for (let i = 0; i < values.length; i++) {
        cmds.push({
          marker,
          values: {
            x: values[i],
            y: 0
          }
        });
      }
      break;
    case "V":
      for (let i = 0; i < values.length; i++) {
        cmds.push({
          marker,
          values: {
            x: 0,
            y: values[i]
          }
        });
      }
      break;
    case "C":
      for (let i = 0; i < values.length; i += 6) {
        cmds.push({
          marker,
          values: {
            x1: values[i],
            y1: values[i + 1],
            x2: values[i + 2],
            y2: values[i + 3],
            x: values[i + 4],
            y: values[i + 5]
          }
        });
      }
      break;
    case "S":
      for (let i = 0; i < values.length; i += 4) {
        cmds.push({
          marker,
          values: {
            x2: values[i],
            y2: values[i + 1],
            x: values[i + 2],
            y: values[i + 3]
          }
        });
      }
      break;
    case "Q":
      for (let i = 0; i < values.length; i += 4) {
        cmds.push({
          marker,
          values: {
            x1: values[i],
            y1: values[i + 1],
            x: values[i + 2],
            y: values[i + 3]
          }
        });
      }
      break;
    case "T":
      for (let i = 0; i < values.length; i += 2) {
        cmds.push({
          marker,
          values: {
            x: values[i],
            y: values[i + 1]
          }
        });
      }
      break;
    case "A":
      for (let i = 0; i < values.length; i += 7) {
        cmds.push({
          marker,
          values: {
            radiusX: values[i],
            radiusY: values[i + 1],
            rotation: values[i + 2],
            largeArc: values[i + 3],
            sweep: values[i + 4],
            x: values[i + 5],
            y: values[i + 6]
          }
        });
      }
      break;
    case "Z":
      cmds.push({
        marker,
        values: {
          x: 0,
          y: 0
        }
      });
      break;}

  return cmds;
}
function mod(x, m) {
  return (x % m + m) % m;
}
function markOverlapped(el, index, array) {
  if (index !== 0 && el.marker === "L") {
    let previous = array[index - 1];
    const overlap = ["x", "y"].every((key) => {
      return Math.round(Math.abs(previous.values[key] - el.values[key])) === 0;
    });
    if (overlap) {
      el.overlap = true;
    }
  }
  return el;
}
function reverseMarkOverlapped(cmds, counter) {
  const overlap = ["x", "y"].every((key) => {
    return Math.round(Math.abs(cmds[counter].values[key] - cmds[0].values[key])) === 0;
  });
  if (cmds[counter].marker === "L" && overlap) {
    cmds[counter].overlap = true;
    reverseMarkOverlapped(cmds, counter - 1);
  }
  if (cmds[counter].marker === "Z") {
    reverseMarkOverlapped(cmds, counter - 1);
  }
}
function shortestSide(el, previous, next) {
  const nxtSide = getDistance(el.values, next.values);
  const prvSide = getDistance(previous.values, el.values);
  return Math.min(prvSide, nxtSide);
}
function getAngle(p1, p2) {
  return Math.atan2(p2.x - p1.x, p2.y - p1.y);
}
function getDistance(p1, p2) {
  const xDiff = p1.x - p2.x;
  const yDiff = p1.y - p2.y;
  return Math.sqrt(Math.pow(xDiff, 2) + Math.pow(yDiff, 2));
}
function getOppositeLength(angle, hip) {
  return Math.sin(angle) * hip;
}
function getAdjacentLength(angle, hip) {
  return Math.cos(angle) * hip;
}
function getTangentLength(angle, opposite) {
  const a = opposite / Math.tan(angle);
  if (a === Infinity || a === -Infinity || isNaN(a)) {
    return opposite;
  }
  return a;
}
function getTangentNoHyp(angle, adjacent) {
  return adjacent * Math.tan(angle);
}
function getOffset(angle, r) {
  let offset;
  let sweepFlag = 0;
  let degrees = angle * (180 / Math.PI);
  if (degrees < 0 && degrees >= -180 || degrees > 180 && degrees < 360) {
    offset = getTangentLength(angle / 2, -r);
  } else {
    offset = getTangentLength(angle / 2, r);
    sweepFlag = 1;
    if (offset === Infinity) {
      offset = r;
    }
  }
  return {
    offset,
    sweepFlag
  };
}
function commandsToSvgPath(cmds) {
  const valuesOrder = [
  "radiusX",
  "radiusY",
  "rotation",
  "largeArc",
  "sweep",
  "x1",
  "y1",
  "x2",
  "y2",
  "x",
  "y"];

  return cmds.map((cmd) => {
    let d = "";
    if (cmd.marker !== "Z") {
      const cmdKeys = Object.keys(cmd.values);
      d = valuesOrder.filter((v) => cmdKeys.indexOf(v) !== -1).map((key) => cmd.values[key]).join();
    }
    return `${cmd.marker}${d}`;
  }).join("").trim();
}
function parsePath(str) {
  const markerRegEx = /[MmLlSsQqLlHhVvCcSsQqTtAaZz]/g;
  const digitRegEx = /-?[0-9]*\.?\d+/g;
  return [...str.matchAll(markerRegEx)].map((match) => {
    return { marker: match[0], index: match.index };
  }).reduceRight((acc, cur) => {
    const chunk = str.substring(cur.index, acc.length ? acc[acc.length - 1].index : str.length);
    return acc.concat([
    {
      marker: cur.marker,
      index: cur.index,
      chunk: chunk.length > 0 ? chunk.substr(1, chunk.length - 1) : chunk
    }]);

  }, []).reverse().flatMap((cmd) => {
    const values = cmd.chunk.match(digitRegEx);
    const vals = values ? values.map(parseFloat) : [];
    return newCommands(cmd.marker, vals);
  }).map(convertToAbsolute);
}
function roundCommands(cmds, r, round) {
  let subpaths = [];
  let newCmds = [];
  if (round) {
    cmds.forEach((el) => roundValues(el, round));
  }
  cmds.forEach((e) => {
    if (e.marker === "M") {
      subpaths.push([]);
    }
    subpaths[subpaths.length - 1].push(e);
  });
  subpaths.forEach((subPathCmds) => {
    subPathCmds.map(markOverlapped);
    reverseMarkOverlapped(subPathCmds, subPathCmds.length - 1);
    const closedPath = subPathCmds[subPathCmds.length - 1].marker == "Z";
    subPathCmds.filter((el) => !el.overlap).map((el, i, arr) => {
      const largeArcFlag = 0;
      const prev = getPreviousNoZ(el, i, arr);
      const next = getNextNoZ(el, i, arr);
      const anglePrv = getAngle(el.values, prev.values);
      const angleNxt = getAngle(el.values, next.values);
      const angle = angleNxt - anglePrv;
      const degrees = angle * (180 / Math.PI);
      const shortest = shortestSide(el, prev, next);
      const maxRadius = Math.abs(getTangentNoHyp(angle / 2, shortest / 2));
      const radius = Math.min(r, maxRadius);
      const o = getOffset(angle, radius);
      const offset = o.offset;
      const sweepFlag = o.sweepFlag;
      const openFirstOrLast = (i == 0 || i == arr.length - 1) && !closedPath;
      switch (el.marker) {
        case "M":
        case "L":
          const prevPoint = [
          el.values.x + getOppositeLength(anglePrv, offset),
          el.values.y + getAdjacentLength(anglePrv, offset)];

          const nextPoint = [
          el.values.x + getOppositeLength(angleNxt, offset),
          el.values.y + getAdjacentLength(angleNxt, offset)];

          if (!openFirstOrLast) {
            newCmds.push({
              marker: el.marker,
              values: {
                x: parseFloat(prevPoint[0].toFixed(3)),
                y: parseFloat(prevPoint[1].toFixed(3))
              }
            });
          } else {
            newCmds.push({
              marker: el.marker,
              values: el.values
            });
          }
          if (!openFirstOrLast && (next.marker === "L" || next.marker === "M")) {
            newCmds.push({
              marker: "A",
              radius,
              values: {
                radiusX: radius,
                radiusY: radius,
                rotation: degrees,
                largeArc: largeArcFlag,
                sweep: sweepFlag,
                x: parseFloat(nextPoint[0].toFixed(3)),
                y: parseFloat(nextPoint[1].toFixed(3))
              }
            });
          }
          break;
        case "C":
        case "S":
        case "Q":
        case "T":
        case "A":
        case "Z":
          newCmds.push({ marker: el.marker, values: el.values });
          break;}

    });
  });
  return {
    path: commandsToSvgPath(newCmds),
    commands: newCmds
  };
}
function roundCorners(str, r, round) {
  return roundCommands([...parsePath(str)], r, round);
}

export { bisector, centroid as geoCentroid, circle as geoCircle, distance as geoDistance, graticule as geoGraticule, interpolate as geoInterpolate, orthographic as geoOrthographic, index as geoPath, rotation as geoRotation, pointer, roundCorners, select, selectAll, feature as topoToFeature, versor };
