/**
 * @doc_link https://github.com/hizzgdev/jsmind/blob/master/docs/zh/3.operation.md
 */

(function ($w) {
  'use strict';
  console.warn('这是一个菜单插件');
  var __name__ = 'jsMind';
  var jsMind = $w[__name__];
  if (!jsMind) {
    return;
  }
  if (typeof jsMind.menu != 'undefined') {
    return;
  }

  /**
   * @constructor
   * @param {*} jm jsmind实例
   */
  jsMind.menu = function (jm) {
    this.menu = null;
    this.subMenu = null;
    this.selectNode = null;
    this.copiedNode = null;
    // 触发编辑时候的模式：添加子节点，添加兄弟节点，添加文本节点，重命名节点
    this.operateMode = '';
    this.jm = jm;
    this.menuOptions = [
      {
        label: '添加',
        children: [
          {
            label: '节点',
            evt: 'add_bro'
          },
          {
            label: '子节点',
            evt: 'add_child'
          }
        ]
      },
      {
        label: '移动',
        children: [
          {
            label: '上移',
            evt: 'before_move'
          },
          {
            label: '下移',
            evt: 'after_move'
          },
          {
            label: '升级',
            evt: 'front_move'
          },
          {
            label: '降级',
            evt: 'back_move'
          }
        ]
      },
      {
        label: '删除',
        evt: 'delete'
      },
      {
        label: '复制',
        evt: 'copy'
      },
      {
        label: '粘贴',
        evt: 'paste'
      },
      {
        label: '重命名',
        evt: 'rename'
      },
      {
        label: '转换为标题',
        evt: 'trans2heading'
      },
      {
        label: '转换为文本',
        evt: 'trans2text'
      },
      {
        label: '全部展开',
        evt: 'expand_all'
      },
      {
        label: '全部收起',
        evt: 'collapse_all'
      }
    ];
  };

  jsMind.menu.prototype = {
    init: function () {
      const root = this.jm.get_root();
      this.addMenu(root);
      this.addEvent();
    },
    addIconStyle: function (iconTag) {
      iconTag.style.width = 16 + 'px';
      iconTag.style.height = 16 + 'px';
      iconTag.style.background = '#bbe4ff';
      iconTag.style.position = 'absolute';
      iconTag.style.bottom = -18 + 'px';
      iconTag.style.right = 0 + 'px';
      iconTag.style.backgroundImage = `url('static/img/jsmind/菜单.svg')`;
      iconTag.style.backgroundSize = `100% 100%`;
      iconTag.style.cursor = 'pointer';
    },
    createMenu: function (el, node) {
      this.removeMenu();
      this.menu = document.createElement('ul');
      this.menu.classList.add('kingdom-operation-menu');
      this.menu.style.left = el.getBoundingClientRect().right + 'px';
      this.menu.style.top = el.getBoundingClientRect().bottom + 'px';
      document.body.appendChild(this.menu);

      function hasChildren(node) {
        return !!node.children;
      }

      const judge = (evt) => {
        console.log(this);
        return Reflect.ownKeys(menuableAction).includes(evt) && !menuableAction[evt].call(this)
      }

      // 判断菜单是否可用
      const menuableAction = {
        add_child() {
          return !jsMind.util.node.is_text(node) && !jsMind.util.node.is_model(node)
        },
        add_bro() {
          return jsMind.util.node.is_heading(node)
        },
        before_move() {
          return !node.isroot && this.jm.find_node_before(node)
        },
        after_move() {
          return !node.isroot && this.jm.find_node_after(node)
        },
        front_move() {
          return !node.isroot && !node.parent.isroot
        },
        back_move() {
          return !node.isroot && this.jm.find_node_before(node)
        },
        trans2heading() {
          return jsMind.util.node.is_heading(node)
        },
        trans2text() {
          return jsMind.util.node.is_heading(node) && !node.children.length
        }
      };

      this.menuOptions.forEach(item => {
        const li = document.createElement('li');
        li.innerText = item.label;
        this.menu.appendChild(li);
        if (hasChildren(item)) {
          // 添加icon
          const arrow = document.createElement('img');
          arrow.src = 'static/img/jsmind/arrow-right.svg';
          arrow.style.width = 16 + 'px';
          li.appendChild(arrow);
          // 添加事件
          li.addEventListener('mouseenter', e => {
            //   console.log(e);
            this.subMenu && this.subMenu.remove();
            this.subMenu = document.createElement('ul');
            this.subMenu.classList.add('kingdom-operation-menu');
            document.body.appendChild(this.subMenu);
            this.subMenu.style.left = e.target.getBoundingClientRect().right + 'px';
            this.subMenu.style.top = e.target.getBoundingClientRect().top + 'px';
            let fragment = document.createDocumentFragment()
            item.children.forEach(child => {
              const li = document.createElement('li');
              li.innerText = child.label;
              fragment.appendChild(li)
              if (judge(child.evt)) {
                li.classList.add('disabled');
              } else {
                li.addEventListener('click', () => {
                  this.handleEvt.call(this, child.evt);
                });
              }
            });
            this.subMenu.appendChild(fragment);
          });
        } else {
          if (judge(item.evt)) {
            li.classList.add('disabled');
          } else {
            li.addEventListener('mouseenter', () => {
              this.subMenu && this.subMenu.remove();
            });
            li.addEventListener('click', () => {
              this.handleEvt.call(this, item.evt);
            });
          }
        }
      });
      // 底部菜单溢出问题
      if (this.menu.getBoundingClientRect().bottom > window.innerHeight) {
        this.menu.style.top = window.innerHeight - this.menu.getBoundingClientRect().height + 'px';
      }
    },
    addMenu: function (node) {
      const el = document.querySelector(`jmnode[nodeid="${node.id}"]`);
      const iconTag = document.createElement('div');
      el.appendChild(iconTag);
      this.addIconStyle(iconTag);
      // 点击事件
      iconTag.addEventListener('click', e => {
        e.stopPropagation();
        this.createMenu(e.target, node);
      });
      if (Array.isArray(node.children) && node.children.length) {
        node.children.forEach(child => {
          this.addMenu(child);
        });
      }
    },
    addEvent: function () {
      document.body.addEventListener('click', () => {
        this.menu && this.menu.remove();
        this.subMenu && this.subMenu.remove();
      });
      // 把菜单项同步到快捷键
      const handler = this.jm.options.shortcut.handles;
      const evt_arr = [
        'add_bro',
        'add_child',
        'before_move',
        'after_move',
        'front_move',
        'back_move',
        'delete',
        'copy',
        'paste',
        'rename',
        'trans2heading',
        'trans2text',
        'toggle',
        'cancel_select',
        'up',
        'down',
        'left',
        'right'
      ];
      evt_arr.forEach(evt => {
        handler[evt] = this.handleEvt.bind(this, evt);
      });
      this.add2Mappings.call(this.jm.shortcut);
    },
    removeMenu: function (el) {
      let menuArr = Array.from(document.getElementsByClassName('kingdom-operation-menu'));
      menuArr.forEach(menu => menu.remove());
    },
    /**
     * @desc 将快捷键的处理函数插入jm实例中，还需要掉下这个方法，更新mapping
     */
    add2Mappings: function () {
      for (var handle in this.mapping) {
        if (!!this.mapping[handle] && handle in this.handles) {
          var keys = this.mapping[handle];
          if (!Array.isArray(keys)) {
            keys = [keys];
          }
          for (let key of keys) {
            this._mapping[key] = this.handles[handle];
          }
        }
      }
    },
    handleEvt: function (evt, ke) {
      const handler = this.jm.options.shortcut.handles;
      var jm = this.jm;
      this.selectNode = jm.get_selected_node();
      if (!this.selectNode) {
        const root = jm.get_root();
        jm.select_node(root);
        this.selectNode = root;
      }
      const Action = {
        add_bro() {
          if (this.selectNode.isroot) {
            window.top.$Message({
              type: 'warning',
              message: '根节点无法添加同级节点'
            })
            return
          }
          let parent_node = this.selectNode.parent,
            node_id = jsMind.util.uuid.newid(),
            topic = '节点1',
            data = {},
            direction = this.selectNode.direction;
          const newNode = jm.add_node(parent_node, node_id, topic, data, direction);
          jm.begin_edit(newNode);
          this.changeOperateMode('add_bro');
        },
        add_child() {
          let parent_node = this.selectNode,
            node_id = jsMind.util.uuid.newid(),
            topic = '节点1',
            data = { chapterType: 'heading' },
            direction = this.selectNode.direction;
          if (jsMind.util.node.is_text(parent_node) || jsMind.util.node.is_model(parent_node)) {
            return window.top.$Message.warning('文本节点或模型节点后无法添加节点')
          }
          const newNode = jm.add_node(parent_node, node_id, topic, data, direction);
          jm.begin_edit(newNode);
          this.changeOperateMode('add_child');
        },
        add_text() {
          let parent_node = this.selectNode,
            node_id = jsMind.util.uuid.newid(),
            topic = '节点1',
            data = { chapterType: 'text' },
            direction = this.selectNode.direction;
          if (jsMind.util.node.is_text(parent_node) || jsMind.util.node.is_model(parent_node)) {
            return window.top.$Message.warning('文本节点或模型节点后无法添加节点')
          }
          if(parent_node.isroot){
            return window.top.$Message.warning('文本节点只能添加到标题节点后')
          }
          const newNode = jm.add_node(parent_node, node_id, topic, data, direction);
          jm.begin_edit(newNode);
          this.changeOperateMode('add_text');
        },
        before_move() {
          if (this.selectNode.isroot) return;
          return handler.request('before_move', this.selectNode);
          // 本地操作
          const node_before = jm.find_node_before(this.selectNode);
          if (!node_before) return;
          jm.move_node(this.selectNode, node_before.id);
        },
        after_move() {
          if (this.selectNode.isroot) return;
          return handler.request('after_move', this.selectNode);
          // 本地操作
          const node_after = jm.find_node_after(this.selectNode);
          if (!node_after) return;
          const node_after_after = jm.find_node_after(node_after);
          if (!node_after_after) {
            jm.move_node(this.selectNode, '_last_');
          } else {
            jm.move_node(this.selectNode, node_after_after.id);
          }
        },
        front_move() {
          if (this.selectNode.isroot || this.selectNode.parent.isroot) return;
          return handler.request('front_move', this.selectNode);
          // 本地操作
          const parent_node = this.selectNode.parent.parent;
          jm.move_node(this.selectNode, '_last_', parent_node.id);
        },
        back_move() {
          handler.request('back_move', this.selectNode);
        },
        delete() {
          if (!!this.selectNode && !this.selectNode.isroot) {
            return handler.request('delete', this.selectNode);
            // 本地操作
            const parent = this.selectNode.parent;
            jm.remove_node(this.selectNode);
            jm.select_node(parent);
          } else {
            window.top.$Message({
              type: 'warning',
              message: '无法删除根节点'
            })
          }
        },
        copy() {
          console.log('copy');
          const selectCloneNode = _.cloneDeep(this.selectNode);
          this.copiedNode = selectCloneNode;
          handler.request('copy', this.selectNode);
        },
        paste() {
          if (!this.copiedNode) return;
          return handler.request('paste', this.copiedNode, this.selectNode);
          // 本地操作
          const parent_node = this.selectNode;
          const { id: node_id, topic, data, direction } = this.copiedNode;
          const copyNodeId = node_id + '_' + jsMind.util.uuid.newid();
          jm.add_node(parent_node, copyNodeId, topic, data, direction);
        },
        rename() {
          jm.begin_edit(this.selectNode);
          this.changeOperateMode('rename');
        },
        trans2heading() {
          if (this.selectNode.isroot) return;
          handler.request('trans2heading', this.selectNode);
        },
        trans2text() {
          if (this.selectNode.isroot) return;
          handler.request('trans2text', this.selectNode);
        },
        collapse_all() {
          this.selectNode.isroot ? jm.collapse_all() : Action.toggle.call(this);
        },
        expand_all() {
          this.selectNode.isroot ? jm.expand_all() : Action.toggle.call(this);
        },
        toggle() {
          if (!this.selectNode) return;
          jm.toggle_node(this.selectNode);
        },
        cancel_select() {
          jm.select_clear();
        },
        up() {
          var selected_node = jm.get_selected_node();
          if (!!selected_node) {
            var up_node = jm.find_node_before(selected_node);
            if (!up_node) {
              var np = jm.find_node_before(selected_node.parent);
              if (!!np && np.children.length > 0) {
                up_node = np.children[np.children.length - 1];
              }
            }
            if (!!up_node) {
              jm.select_node(up_node);
            }

            ke.stopPropagation();
            ke.preventDefault();
          }
        },
        down() {
          var selected_node = jm.get_selected_node();
          if (!!selected_node) {
            var down_node = jm.find_node_after(selected_node);
            if (!down_node) {
              var np = jm.find_node_after(selected_node.parent);
              if (!!np && np.children.length > 0) {
                down_node = np.children[0];
              }
            }
            if (!!down_node) {
              jm.select_node(down_node);
            }
            ke.stopPropagation();
            ke.preventDefault();
          }
        },
        left() {
          Action._handle_direction(jm, ke, jsMind.direction.left);
        },
        right() {
          Action._handle_direction(jm, ke, jsMind.direction.right);
        },
        _handle_direction: function (_jm, e, d) {
          var evt = e || event;
          var selected_node = _jm.get_selected_node();
          var node = null;
          if (!!selected_node) {
            if (selected_node.isroot) {
              var c = selected_node.children;
              var children = [];
              for (var i = 0; i < c.length; i++) {
                if (c[i].direction === d) {
                  children.push(i);
                }
              }
              node = c[children[Math.floor((children.length - 1) / 2)]];
            } else if (selected_node.direction === d) {
              var children = selected_node.children;
              var childrencount = children.length;
              if (childrencount > 0) {
                node = children[Math.floor((childrencount - 1) / 2)];
              }
            } else {
              node = selected_node.parent;
            }
            if (!!node) {
              _jm.select_node(node);
            }
            evt.stopPropagation();
            evt.preventDefault();
          }
        }
      };
      Action[evt] && Action[evt].call(this);
    },
    changeOperateMode: function (mode) {
      const modeArr = ['add_child', 'add_bro', 'add_text', 'rename'];
      if (!modeArr.includes(mode)) {
        console.error('没有相关的操作模式');
        return;
      }
      this.operateMode = mode;
    },

    jm_event_handle: function (type, data) {
      //   if (type === jsMind.event_type.resize) {
      //     this.resize();
      //   }
    }
  };

  //
  var menu_plugin = new jsMind.plugin('menu', function (jm) {
    var jsm = new jsMind.menu(jm);
    jm.menu = jsm;
    jsm.init();
    jm.add_event_listener(function (type, data) {
      jsm.jm_event_handle.call(jsm, type, data);
    });
  });

  jsMind.register_plugin(menu_plugin);
})(window);
