import { defineComponent as i, computed as r, onMounted as u, watch as f, openBlock as d, createElementBlock as p, normalizeStyle as m, normalizeClass as _, createElementVNode as v } from "vue";
const g = ["href"], h = /* @__PURE__ */ i({
  __name: "SvgIcon",
  props: {
    iconClass: {},
    className: { default: "" },
    color: { default: "" },
    size: { default: "" }
  },
  setup(o) {
    const e = o, n = r(() => `#icon-${e.iconClass}`), t = r(() => ["svg-icon", e.className].filter(Boolean)), c = r(() => {
      const s = {};
      if (e.color && (s.color = e.color), e.size) {
        const a = typeof e.size == "number" ? `${e.size}px` : e.size;
        s.width = a, s.height = a;
      }
      return s;
    });
    async function l() {
    }
    return u(l), f(() => e.iconClass, l), (s, a) => (d(), p("svg", {
      class: _(t.value),
      style: m(c.value),
      "aria-hidden": "true"
    }, [
      v("use", { href: n.value }, null, 8, g)
    ], 6));
  }
}), z = (o, e) => {
  const n = o.__vccOpts || o;
  for (const [t, c] of e)
    n[t] = c;
  return n;
}, C = /* @__PURE__ */ z(h, [["__scopeId", "data-v-a614ac61"]]);
function I(o) {
  return o;
}
export {
  C as SvgIcon,
  C as default,
  I as defineSvgIcons
};
