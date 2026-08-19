/**
 * dsh-width — client half.
 *
 * Browser bundle loaded by the client module loader. It:
 *   1. binds the durable `dsh-width` settings scope,
 *   2. registers the "显示" (Display) settings page with two width sliders,
 *   3. applies the widths live by overriding the two width CSS variables on
 *      the stable `[data-conversation-scroll]` element (hash-independent).
 */
window.__ModuleLoader__.load({
  id: 'dsh-width',
  factory: (require) => {
    'use strict';
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

    var React = require('react');

    // ---------------------------------------------------------------------
    // Constants (keep in sync with lib/index.js and dsh.plugin.json)
    // ---------------------------------------------------------------------
    var NS = 'dsh-width';
    var ROW_NS = 'settings.dsh-width';
    var CONTENT_FIELD = 'contentWidth';
    var INPUT_FIELD = 'inputWidth';
    var MIN = 30;
    var MAX = 100;
    var STEP = 5;
    var DEFAULT = 100;
    var SECTION_ORDER = 70;

    var SECTION_CSS_ID = 'dsh-width/section';
    var WIDTH_CSS_ID = 'dsh-width/width';

    // ---------------------------------------------------------------------
    // Locale dictionaries (zh is the key-set source of truth)
    // ---------------------------------------------------------------------
    var zh = {
      'nav': '显示',
      'title': '显示',
      'desc': '调整输入框和内容展示区的宽度（占中间栏的百分比），改动即时生效。',
      'contentWidth.label': '内容展示区宽度',
      'contentWidth.desc': '消息内容列的宽度',
      'inputWidth.label': '输入框宽度',
      'inputWidth.desc': '底部输入框的宽度',
      'reset': '重置',
    };
    var en = {
      'nav': 'Display',
      'title': 'Display',
      'desc': 'Adjust the width of the input box and the content area (percentage of the center column). Changes apply immediately.',
      'contentWidth.label': 'Content area width',
      'contentWidth.desc': 'Width of the message content column',
      'inputWidth.label': 'Input box width',
      'inputWidth.desc': 'Width of the composer input box',
      'reset': 'Reset',
    };

    // ---------------------------------------------------------------------
    // CSS
    // ---------------------------------------------------------------------
    var SECTION_CSS = [
      '.dshw-section{padding:8px 4px;display:flex;flex-direction:column;gap:18px}',
      '.dshw-title{font-size:18px;line-height:24px;font-weight:600;color:var(--dsw-alias-label-primary);margin:0}',
      '.dshw-desc{font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary);margin:0}',
      '.dshw-row{display:flex;flex-direction:column;gap:8px}',
      '.dshw-rowHead{display:flex;align-items:baseline;justify-content:space-between;gap:8px}',
      '.dshw-rowLabel{font-size:14px;line-height:20px;color:var(--dsw-alias-label-primary)}',
      '.dshw-rowDesc{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}',
      '.dshw-rowValue{flex:none;min-width:44px;text-align:right;font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}',
      '.dshw-sliderWrap{display:flex;align-items:center;gap:8px}',
      '.dshw-range{flex:auto;min-width:0;accent-color:var(--dsw-alias-brand-primary);height:20px;margin:0}',
      '.dshw-reset{flex:none;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);border-radius:8px;padding:2px 10px;font-size:12px;line-height:20px;cursor:pointer}',
      '.dshw-reset:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}',
      '.dshw-reset:disabled{opacity:.5;cursor:default}',
    ].join('\n');

    // ---------------------------------------------------------------------
    // Style tag helpers
    // ---------------------------------------------------------------------
    function getStyle(id) {
      if (typeof document === 'undefined') return null;
      return document.querySelector('style[data-plugin-css=' + JSON.stringify(id) + ']');
    }
    function injectStyle(id, css) {
      if (typeof document === 'undefined') return;
      if (getStyle(id) !== null) return;
      var tag = document.createElement('style');
      tag.dataset.plugin = 'dsh-width';
      tag.dataset.pluginCss = id;
      tag.textContent = css;
      document.head.appendChild(tag);
    }
    function setStyleText(id, css) {
      if (typeof document === 'undefined') return;
      var tag = getStyle(id);
      if (tag === null) {
        injectStyle(id, css);
        return;
      }
      tag.textContent = css;
    }
    function removeStyle(id) {
      var tag = getStyle(id);
      if (tag !== null) tag.remove();
    }

    /**
     * Apply the two widths. Both values are a percentage OF THE CENTER COLUMN.
     *
     * The composer stack is pinned to full width (`--dsh-composer-card-max-width:
     * 100%`) so the card's own `max-width: <input>%` resolves against the center
     * column and matches the message column's `content%` — if the stack kept its
     * stock 780px width, an "85%" input box would only be ~85% of 780px while
     * the message column would be 85% of the column (e.g. 624px vs 1020px on a
     * 1200px column), which reads as "the input box setting does not work".
     * With the stack full width the card stays centered; only the card's width
     * changes, nothing else on the page is resized.
     *
     * On the hero (new-session) page the workspace / agent-preset row is
     * aligned to the card's left edge from JS (`alignHeroMenuRow`): the card's
     * exact left offset depends on the card width, the centered stack and the
     * InputBar padding, which pure CSS cannot express without resizing the
     * stack, so we move only that one row with a pixel-perfect margin-left.
     */
    function applyWidths(content, input) {
      var css = [
        '[data-conversation-scroll]{' +
          '--dsh-chat-content-width:' + content + '%!important;' +
          '--dsh-composer-card-max-width:100%!important;' +
          '}',
        '[data-chat-flow]{max-width:' + content + '%!important}',
        '[data-composer-card]{max-width:' + input + '%!important}',
      ].join('\n');
      setStyleText(WIDTH_CSS_ID, css);
    }

    // ---------------------------------------------------------------------
    // Hero menu-row alignment (JS — precise, no layout side effects)
    // ---------------------------------------------------------------------
    var alignRaf = 0;

    /**
     * Move the hero workspace / agent-preset row so its left edge lines up
     * with the input card's left edge. No-op while the hero page is absent or
     * the elements are not rendered yet.
     *
     * The offset is measured against the row's UN-MARGINED stock position
     * (temporarily clearing marginLeft, reading, restoring — all in the same
     * synchronous frame, so nothing paints in between). Measuring the current
     * (already shifted) position instead would make the delta converge to 0 and
     * the row would snap back and forth on every re-align — which is what made
     * the menu buttons jump around on every refresh.
     */
    function alignHeroMenuRow() {
      if (typeof document === 'undefined') return;
      var root = document.querySelector('[data-phase="hero"]');
      if (root === null) return;
      var card = root.querySelector('[data-composer-card]');
      var chip = root.querySelector('button[aria-haspopup="menu"]');
      if (card === null || chip === null) return;
      var row = chip.parentElement;
      if (row === null || row === chip) return;
      var previous = row.style.marginLeft;
      if (previous !== '') row.style.marginLeft = '';
      var rowLeft = row.getBoundingClientRect().left;
      row.style.marginLeft = previous;
      var delta = Math.round(card.getBoundingClientRect().left - rowLeft);
      var next = delta === 0 ? '' : delta + 'px';
      if (row.style.marginLeft !== next) row.style.marginLeft = next;
    }

    /**
     * Keep the in-session task list (TodoPanel, `data-testid="todo-panel"`)
     * exactly as wide as the input card. The card's `input%` resolves against
     * the InputBar root content box (center column minus side clearances),
     * which plain CSS cannot reproduce for the dock panel, so we measure the
     * card and set the panel's width in px.
     */
    function alignTodoPanel() {
      if (typeof document === 'undefined') return;
      var panel = document.querySelector('[data-testid="todo-panel"]');
      var card = document.querySelector('[data-composer-card]');
      if (panel === null || card === null) return;
      var cardWidth = Math.round(card.getBoundingClientRect().width);
      if (panel.style.width !== cardWidth + 'px') panel.style.width = cardWidth + 'px';
    }

    /** rAF-throttled align call (MutationObserver / resize fire often). */
    function scheduleAlignHero() {
      if (typeof requestAnimationFrame === 'undefined') {
        alignHeroMenuRow();
        alignTodoPanel();
        return;
      }
      if (alignRaf !== 0) return;
      alignRaf = requestAnimationFrame(function () {
        alignRaf = 0;
        alignHeroMenuRow();
        alignTodoPanel();
      });
    }

    /**
     * Keep the hero menu row aligned and the task list width in sync across
     * mount/unmount, settings changes, DOM churn, and window resizes. Returns
     * the disposer.
     */
    function watchHeroAlignment() {
      if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return undefined;
      var observer = new MutationObserver(scheduleAlignHero);
      observer.observe(document.body, { childList: true, subtree: true });
      if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('resize', scheduleAlignHero);
      }
      scheduleAlignHero();
      return function () {
        observer.disconnect();
        if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
          window.removeEventListener('resize', scheduleAlignHero);
        }
        // Drop inline widths we set so an unload leaves no residue.
        if (typeof document !== 'undefined') {
          var panels = document.querySelectorAll('[data-testid="todo-panel"]');
          for (var i = 0; i < panels.length; i++) panels[i].style.width = '';
        }
      };
    }

    // ---------------------------------------------------------------------
    // Components
    // ---------------------------------------------------------------------
    function SliderRow(props) {
      // props: { t, labelKey, descKey, value, disabled, onChange }
      var t = props.t;
      var value = props.value;
      var disabled = props.disabled;
      return React.createElement('div', { className: 'dshw-row' }, [
        React.createElement('div', { className: 'dshw-rowHead', key: 'head' }, [
          React.createElement('span', { className: 'dshw-rowLabel', key: 'label' }, t(props.labelKey)),
          React.createElement('span', { className: 'dshw-rowValue', key: 'value' }, value + '%'),
        ]),
        React.createElement('span', { className: 'dshw-rowDesc', key: 'desc' }, t(props.descKey)),
        React.createElement('div', { className: 'dshw-sliderWrap', key: 'slider' }, [
          React.createElement('input', {
            key: 'range',
            type: 'range',
            className: 'dshw-range',
            min: String(MIN),
            max: String(MAX),
            step: String(STEP),
            value: value,
            disabled: disabled,
            'aria-label': t(props.labelKey),
            onChange: function (e) { props.onChange(Number(e.target.value)); },
          }),
          React.createElement('button', {
            key: 'reset',
            type: 'button',
            className: 'dshw-reset',
            disabled: disabled,
            title: t('reset') + ' ' + DEFAULT + '%',
            onClick: function () { props.onChange(DEFAULT); },
          }, t('reset')),
        ]),
      ]);
    }

    function SettingsSection(props) {
      // props: { t, scope }
      var t = props.t;
      var scope = props.scope;

      // scope methods are `this`-bound — wrap them for useSyncExternalStore.
      var snapshot = React.useSyncExternalStore(
        function (listener) { return scope.subscribe(listener); },
        function () { return scope.getSnapshot(); },
      );

      var value = snapshot.value || {};
      var disabled = snapshot.status !== 'ready' || !snapshot.writable;

      var content = typeof value[CONTENT_FIELD] === 'number' ? value[CONTENT_FIELD] : DEFAULT;
      var input = typeof value[INPUT_FIELD] === 'number' ? value[INPUT_FIELD] : DEFAULT;

      var setField = function (field, next) {
        scope.set(field, next).catch(function () {});
      };

      return React.createElement('section', { className: 'dshw-section', 'aria-labelledby': 'dsh-width-settings-title' }, [
        React.createElement('h2', { id: 'dsh-width-settings-title', className: 'dshw-title', key: 'title' }, t('title')),
        React.createElement('p', { className: 'dshw-desc', key: 'desc' }, t('desc')),
        React.createElement(SliderRow, {
          key: 'content',
          t: t,
          labelKey: 'contentWidth.label',
          descKey: 'contentWidth.desc',
          value: content,
          disabled: disabled,
          onChange: function (next) { setField(CONTENT_FIELD, next); },
        }),
        React.createElement(SliderRow, {
          key: 'input',
          t: t,
          labelKey: 'inputWidth.label',
          descKey: 'inputWidth.desc',
          value: input,
          disabled: disabled,
          onChange: function (next) { setField(INPUT_FIELD, next); },
        }),
      ]);
    }

    // ---------------------------------------------------------------------
    // Plugin body
    // ---------------------------------------------------------------------
    var inject = ['slots', 'locale', 'connection', 'remote', 'settingsScope'];

    function apply(ctx) {
      // Durable settings scope (namespace registered by the node half).
      var scope = ctx.settingsScope.bind({ namespace: NS });
      var t = ctx.locale.bind(ROW_NS);

      // Inject the static section styles once.
      injectStyle(SECTION_CSS_ID, SECTION_CSS);

      // Follow the settings scope: apply the widths on every change, and
      // once immediately so the defaults hold while settings are loading.
      var applyFromScope = function () {
        var snap = scope.getSnapshot();
        var v = snap.value || {};
        var content = typeof v[CONTENT_FIELD] === 'number' ? v[CONTENT_FIELD] : DEFAULT;
        var input = typeof v[INPUT_FIELD] === 'number' ? v[INPUT_FIELD] : DEFAULT;
        applyWidths(content, input);
        scheduleAlignHero();
      };
      scope.subscribe(applyFromScope);
      applyFromScope();

      // Keep the hero menu row flush with the input card (hero mount/unmount,
      // DOM churn, resizes).
      var stopAlign = watchHeroAlignment();

      // Locale dictionaries for the section (nav label + page copy).
      ctx.effect(function () {
        return ctx.locale.register(ROW_NS, { zh: zh, en: en });
      }, 'dsh-width: settings dictionaries');

      // Register the dedicated "显示" settings page.
      ctx.slots.inject('settings.section', function () {
        return ctx.slots.register(
          {
            name: 'settings.section',
            id: 'dsh-width',
            order: SECTION_ORDER,
            label: function () { return t('nav'); },
            locale: ROW_NS,
            inject: function () { return { scope: scope }; },
          },
          SettingsSection,
        );
      });

      // Remove injected styles and stop DOM watching on dispose.
      ctx.effect(function () {
        return function () {
          removeStyle(SECTION_CSS_ID);
          removeStyle(WIDTH_CSS_ID);
          if (typeof stopAlign === 'function') stopAlign();
        };
      }, 'dsh-width: style cleanup');
    }

    module.exports = { apply: apply, inject: inject };
    return module.exports;
  },
});
