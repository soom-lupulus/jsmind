/**
 * @license BSD
 * @copyright 2014-2023 hizzgdev@163.com
 *
 * Project Home:
 *   https://github.com/hizzgdev/jsmind/
 */

(function($w) {
  'use strict';
  console.warn('The version is outdated. see details: https://hizzgdev.github.io/jsmind/es6/');
  var $d = $w.document;
  var __name__ = 'jsMind';
  var jsMind = $w[__name__];
  if (!jsMind) {
    return;
  }
  if (typeof jsMind.draggable != 'undefined') {
    return;
  }

  var jdom = jsMind.util.dom;
  var clear_selection =
    'getSelection' in $w
      ? function() {
          $w.getSelection().removeAllRanges();
        }
      : function() {
          $d.selection.empty();
        };

  var options = {
    line_width: 5,
    line_color: 'rgba(0,0,0,0.3)',
    lookup_delay: 500,
    lookup_interval: 80,
    scrolling_trigger_width: 20,
    scrolling_step_length: 10
  };

  jsMind.draggable = function(jm) {
    this.jm = jm;
    this.e_canvas = null;
    this.canvas_ctx = null;
    this.shadow = null;
    this.shadow_w = 0;
    this.shadow_h = 0;
    this.active_node = null;
    this.target_node = null;
    this.target_direct = null;
    this.client_w = 0;
    this.client_h = 0;
    this.offset_x = 0;
    this.offset_y = 0;
    this.hlookup_delay = 0;
    this.hlookup_timer = 0;
    this.capture = false;
    this.moved = false;
    this.view_panel = jm.view.e_panel;
    this.view_panel_rect = null;
    this.kd_added = false;
  };

  jsMind.draggable.prototype = {
    init: function() {
      this._create_canvas();
      this._create_shadow();
      this._event_bind();
    },

    resize: function() {
      this.jm.view.e_nodes.appendChild(this.shadow);
      this.e_canvas.width = this.jm.view.size.w;
      this.e_canvas.height = this.jm.view.size.h;
    },

    _create_canvas: function() {
      var c = $d.createElement('canvas');
      this.jm.view.e_panel.appendChild(c);
      var ctx = c.getContext('2d');
      this.e_canvas = c;
      this.canvas_ctx = ctx;
    },

    _create_shadow: function() {
      var s = $d.createElement('jmnode');
      s.style.visibility = 'hidden';
      s.style.zIndex = '3';
      s.style.cursor = 'move';
      s.style.opacity = '0.7';
      this.shadow = s;
    },

    reset_shadow: function(el) {
      var s = this.shadow.style;
      this.shadow.innerHTML = el.innerHTML;
      s.left = el.style.left;
      s.top = el.style.top;
      s.width = el.style.width;
      s.height = el.style.height;
      s.backgroundImage = el.style.backgroundImage;
      s.backgroundSize = el.style.backgroundSize;
      s.transform = el.style.transform;
      this.shadow_w = this.shadow.clientWidth;
      this.shadow_h = this.shadow.clientHeight;
    },

    show_shadow: function() {
      if (!this.moved) {
        this.shadow.style.visibility = 'visible';
      }
    },

    hide_shadow: function() {
      this.shadow.style.visibility = 'hidden';
    },

    _magnet_shadow: function(node) {
      if (!!node) {
        this.canvas_ctx.lineWidth = options.line_width;
        this.canvas_ctx.strokeStyle = options.line_color;
        this.canvas_ctx.lineCap = 'round';
        this._clear_lines();
        this._canvas_lineto(node.sp.x, node.sp.y, node.np.x, node.np.y);
      }
    },

    _clear_lines: function() {
      this.canvas_ctx.clearRect(0, 0, this.jm.view.size.w, this.jm.view.size.h);
    },

    _canvas_lineto: function(x1, y1, x2, y2) {
      this.canvas_ctx.beginPath();
      this.canvas_ctx.moveTo(x1, y1);
      this.canvas_ctx.lineTo(x2, y2);
      this.canvas_ctx.stroke();
    },

    _lookup_close_node: function() {
      var root = this.jm.get_root();
      var root_location = root.get_location();
      var root_size = root.get_size();
      var root_x = root_location.x + root_size.w / 2;

      var sw = this.shadow_w;
      var sh = this.shadow_h;
      var sx = this.shadow.offsetLeft;
      var sy = this.shadow.offsetTop;

      var ns, nl;

      var direct = sx + sw / 2 >= root_x ? jsMind.direction.right : jsMind.direction.left;
      var nodes = this.jm.mind.nodes;
      var node = null;
      var layout = this.jm.layout;
      var min_distance = Number.MAX_VALUE;
      var distance = 0;
      var closest_node = null;
      var closest_p = null;
      var shadow_p = null;
      for (var nodeid in nodes) {
        var np, sp;
        node = nodes[nodeid];
        if (node.isroot || node.direction == direct) {
          if (node.id == this.active_node.id) {
            continue;
          }
          if (!layout.is_visible(node)) {
            continue;
          }
          ns = node.get_size();
          nl = node.get_location();
          if (direct == jsMind.direction.right) {
            if (sx - nl.x - ns.w <= 0) {
              continue;
            }
            distance = Math.abs(sx - nl.x - ns.w) + Math.abs(sy + sh / 2 - nl.y - ns.h / 2);
            np = { x: nl.x + ns.w - options.line_width, y: nl.y + ns.h / 2 };
            sp = { x: sx + options.line_width, y: sy + sh / 2 };
          } else {
            // 阴影右边不超过目标节点的左边，跳过
            if (nl.x - sx - sw <= 0) {
              continue;
            }
            // 阴影水平方向超出目标节点的距离加上竖直方向超出目标节点的距离
            distance = Math.abs(sx + sw - nl.x) + Math.abs(sy + sh / 2 - nl.y - ns.h / 2);
            np = { x: nl.x + options.line_width, y: nl.y + ns.h / 2 };
            sp = { x: sx + sw - options.line_width, y: sy + sh / 2 };
          }
          if (distance < min_distance) {
            closest_node = node;
            closest_p = np;
            shadow_p = sp;
            min_distance = distance;
          }
        }
      }
      var result_node = null;
      if (!!closest_node) {
        result_node = {
          node: closest_node,
          direction: direct,
          sp: shadow_p,
          np: closest_p
        };
      }
      return result_node;
    },

    lookup_close_node: function() {
      var node_data = this._lookup_close_node();
      if (!!node_data && isPermitConnect()) {
        this._magnet_shadow(node_data);
        this.target_node = node_data.node;
        this.target_direct = node_data.direction;
      }

      function isPermitConnect() {
        console.log(node_data);
        // 模型和文字节点不能连接其他节点
        return !jsMind.util.node.is_leaf(node_data.node);
      }
    },

    _event_bind: function() {
      var jd = this;
      var container = this.jm.view.container;
      jdom.add_event(container, 'mousedown', function(e) {
        var evt = e || event;
        jd.dragstart.call(jd, evt);
      });
      jdom.add_event(container, 'mousemove', function(e) {
        var evt = e || event;
        jd.drag.call(jd, evt);
      });
      jdom.add_event(container, 'mouseup', function(e) {
        var evt = e || event;
        jd.dragend.call(jd, evt);
      });
      jdom.add_event(container, 'touchstart', function(e) {
        var evt = e || event;
        jd.dragstart.call(jd, evt);
      });
      jdom.add_event(container, 'touchmove', function(e) {
        var evt = e || event;
        jd.drag.call(jd, evt);
      });
      jdom.add_event(container, 'touchend', function(e) {
        var evt = e || event;
        jd.dragend.call(jd, evt);
      });
    },

    dragstart: function(e) {
      console.dir(e.target);
      if (!this.jm.get_editable()) {
        return;
      }
      if (this.capture) {
        return;
      }
      this.active_node = null;
      var jview = this.jm.view;
      var el = e.target || event.srcElement;
      if (el.tagName.toLowerCase() != 'jmnode') {
        // 子元素触发兼容
        if (el.dataset.drag) {
          el = el.parentNode;
        } else {
          return;
        }
      }
      if (jview.get_draggable_canvas()) {
        jview.disable_draggable_canvas();
      }
      var nodeid = jview.get_binded_nodeid(el);
      if (!!nodeid) {
        var node = this.jm.get_node(nodeid);
        if (!node.isroot) {
          this.reset_shadow(el);
          this.view_panel_rect = this.view_panel.getBoundingClientRect();
          this.active_node = node;
          this.offset_x = (e.clientX || e.touches[0].clientX) / jview.actualZoom - el.offsetLeft;
          this.offset_y = (e.clientY || e.touches[0].clientY) / jview.actualZoom - el.offsetTop;
          this.client_hw = Math.floor(el.clientWidth / 2);
          this.client_hh = Math.floor(el.clientHeight / 2);
          if (this.hlookup_delay != 0) {
            $w.clearTimeout(this.hlookup_delay);
          }
          if (this.hlookup_timer != 0) {
            $w.clearInterval(this.hlookup_timer);
          }
          var jd = this;
          this.hlookup_delay = $w.setTimeout(function() {
            jd.hlookup_delay = 0;
            jd.hlookup_timer = $w.setInterval(function() {
              jd.lookup_close_node.call(jd);
            }, options.lookup_interval);
          }, options.lookup_delay);
          this.capture = true;
        }
      }
    },

    drag: function(e) {
      if (this.kd_added) {
        return;
      }
      if (!this.jm.get_editable()) {
        return;
      }
      if (this.capture) {
        e.preventDefault();
        this.show_shadow();
        this.moved = true;
        clear_selection();
        var jview = this.jm.view;
        var px = (e.clientX || e.touches[0].clientX) / jview.actualZoom - this.offset_x;
        var py = (e.clientY || e.touches[0].clientY) / jview.actualZoom - this.offset_y;
        // scrolling container axisY if drag nodes exceeding container
        if (
          e.clientY - this.view_panel_rect.top < options.scrolling_trigger_width &&
          this.view_panel.scrollTop > options.scrolling_step_length
        ) {
          this.view_panel.scrollBy(0, -options.scrolling_step_length);
          this.offset_y += options.scrolling_step_length / jview.actualZoom;
        } else if (
          this.view_panel_rect.bottom - e.clientY < options.scrolling_trigger_width &&
          this.view_panel.scrollTop <
            this.view_panel.scrollHeight - this.view_panel_rect.height - options.scrolling_step_length
        ) {
          this.view_panel.scrollBy(0, options.scrolling_step_length);
          this.offset_y -= options.scrolling_step_length / jview.actualZoom;
        }
        // scrolling container axisX if drag nodes exceeding container
        if (
          e.clientX - this.view_panel_rect.left < options.scrolling_trigger_width &&
          this.view_panel.scrollLeft > options.scrolling_step_length
        ) {
          this.view_panel.scrollBy(-options.scrolling_step_length, 0);
          this.offset_x += options.scrolling_step_length / jview.actualZoom;
        } else if (
          this.view_panel_rect.right - e.clientX < options.scrolling_trigger_width &&
          this.view_panel.scrollLeft <
            this.view_panel.scrollWidth - this.view_panel_rect.width - options.scrolling_step_length
        ) {
          this.view_panel.scrollBy(options.scrolling_step_length, 0);
          this.offset_x -= options.scrolling_step_length / jview.actualZoom;
        }
        this.shadow.style.left = px + 'px';
        this.shadow.style.top = py + 'px';
        clear_selection();
      }
    },

    dragend: function(e) {
      console.log('drag-end');
      console.log(this);
      const cannot_connect = (src_node, target_node) => {
        return src_node && target_node && target_node.isroot && (jsMind.util.node.is_model(src_node) || jsMind.util.node.is_text(src_node))
      }
      // 缓存当前画布的位置
      let panelPosition = {
        scrollLeft: this.view_panel.scrollLeft,
        scollTop: this.view_panel.scrollTop
      }
      sessionStorage.setItem('panel_position', JSON.stringify(panelPosition))
      if (!this.jm.get_editable()) {
        return;
      }
      if (this.jm.view.get_draggable_canvas()) {
        this.jm.view.enable_draggable_canvas();
      }
      if (this.capture) {
        if (this.hlookup_delay != 0) {
          $w.clearTimeout(this.hlookup_delay);
          this.hlookup_delay = 0;
          this._clear_lines();
        }
        if (this.hlookup_timer != 0) {
          $w.clearInterval(this.hlookup_timer);
          this.hlookup_timer = 0;
          this._clear_lines();
        }
        if (this.moved) {
          var src_node = this.active_node;
          var target_node = this.target_node;
          var target_direct = this.target_direct;
          //
          if(cannot_connect(src_node, target_node)){
            this.hide_shadow()
            window.top.$Message.warning('文本节点或模型节点不能连接至根节点！')
          }else {
            this.move_node(src_node, target_node, target_direct);
          }
        }
        if (this.kd_added) {
          console.log('add');
          let src_node = this.active_node;
          let target_node = this.target_node;
          let target_direct = this.target_direct;
          const handler = this.jm.options.shortcut.handles;
          if (target_node) {
            if(cannot_connect(src_node, target_node)){
              this.hide_shadow()
              window.top.$Message.warning('文本节点或模型节点不能连接至根节点！')
            }else {
              const { id, topic, data = {} } = src_node;
              this.jm.add_node(target_node, id, topic, data, target_direct);
              // 抛出事件
              typeof handler.model_dragend_callback === 'function'
                ? handler.model_dragend_callback(src_node, target_node, target_direct)
                : console.error('模型拖拽的事件处理不是一个函数');
              this.target_node = null;
            }
          } else {
            typeof handler.no_target_callback === 'function'
              ? handler.no_target_callback()
              : console.error('拖拽至无目标对象的事件处理不是一个函数');
          }
          this.kd_added = false;
        }
        this.hide_shadow();
      }
      this.view_panel_rect = null;
      this.moved = false;
      this.capture = false;
    },

    move_node: function(src_node, target_node, target_direct) {
      var shadow_h = this.shadow.offsetTop;
      if (!!target_node && !!src_node && !jsMind.node.inherited(src_node, target_node)) {
        // lookup before_node
        var sibling_nodes = target_node.children;
        var sc = sibling_nodes.length;
        var node = null;
        var delta_y = Number.MAX_VALUE;
        var node_before = null;
        var beforeid = '_last_';
        while (sc--) {
          node = sibling_nodes[sc];
          if (node.direction == target_direct && node.id != src_node.id) {
            var dy = node.get_location().y - shadow_h;
            if (dy > 0 && dy < delta_y) {
              delta_y = dy;
              node_before = node;
              beforeid = '_first_';
            }
          }
        }
        if (!!node_before) {
          beforeid = node_before.id;
        }
        this.jm.move_node(src_node.id, beforeid, target_node.id, target_direct);
      }
      this.active_node = null;
      this.target_node = null;
      this.target_direct = null;
    },

    jm_event_handle: function(type, data) {
      if (type === jsMind.event_type.resize) {
        this.resize();
      }
      // 添加事件
      if (type === 'out_node_drag_start') {
        console.log(data);
        const { e, node_data } = data;
        // 变量
        this.moved = false;
        this.kd_added = true;
        this.active_node = node_data;
        var el = e.target || event.srcElement;
        var jview = this.jm.view;
        this.offset_x = (e.clientX || e.touches[0].clientX) / jview.actualZoom - el.offsetLeft;
        this.offset_y = (e.clientY || e.touches[0].clientY) / jview.actualZoom - el.offsetTop;
        console.log(el.offsetLeft);
        console.log(el.offsetTop);
        // 前置条件
        // if (el.tagName.toLowerCase() != 'jmnode') { return; }
        if (jview.get_draggable_canvas()) {
          jview.disable_draggable_canvas();
        }
        // 创建一个node_shadow
        var s = this.shadow.style;
        this.shadow.innerHTML = el.innerHTML;
        s.width = 100 + 'px';
        s.height = 25 + 'px';
        s.textOverflow = 'ellipsis';
        s.overFlow = 'hidden';
        s.whiteSpace = 'nowrap';
        this.shadow.innerText = node_data.topic || '新建节点';
        this.shadow_w = this.shadow.clientWidth;
        this.shadow_h = this.shadow.clientHeight;
        this.show_shadow();
        // 连接线
        if (this.hlookup_delay != 0) {
          $w.clearTimeout(this.hlookup_delay);
        }
        if (this.hlookup_timer != 0) {
          $w.clearInterval(this.hlookup_timer);
        }
        var jd = this;
        this.hlookup_delay = $w.setTimeout(function() {
          jd.hlookup_delay = 0;
          jd.hlookup_timer = $w.setInterval(function() {
            jd.lookup_close_node.call(jd);
          }, options.lookup_interval);
        }, options.lookup_delay);
        this.capture = true;
      }
      if (type === 'out_node_drag') {
        // shadow是基于jmnode定位的，拖拽的元素是基于右侧面板定位的，需要转化下位置
        var jview = this.jm.view;
        var e = data;
        var s = this.shadow.style;
        const panelRect = this.shadow.offsetParent.getBoundingClientRect();
        s.left = (e.clientX - panelRect.left - (this.shadow.offsetWidth >> 1)) / jview.actualZoom + 'px';
        s.top = (e.clientY - panelRect.top - (this.shadow.offsetHeight >> 1)) / jview.actualZoom + 'px';
      }
      if (type === 'out_node_drop') {
        const { e } = data;
        console.log(e);
        this.dragend.call(this, e);
      }
      if (type === 'out_node_drag_end') {
      }
    }
  };

  var draggable_plugin = new jsMind.plugin('draggable', function(jm) {
    var jd = new jsMind.draggable(jm);
    jd.init();
    jm.add_event_listener(function(type, data) {
      jd.jm_event_handle.call(jd, type, data);
    });
    // 暴露出来
    jm.jd = jd
  });

  jsMind.register_plugin(draggable_plugin);
})(window);
