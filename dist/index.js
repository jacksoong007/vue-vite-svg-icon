import { defineComponent as u, computed as t, onMounted as f, watch as m, openBlock as d, createElementBlock as v, normalizeStyle as p, normalizeClass as _, createElementVNode as g } from "vue";
const h = ["href"], y = /* @__PURE__ */ u({
  __name: "SvgIcon",
  props: {
    iconName: {},
    iconClass: {},
    className: { default: "" },
    color: { default: "" },
    size: { default: "" }
  },
  setup(o) {
    const e = o, n = t(() => e.iconName || e.iconClass || ""), c = t(() => n.value ? `#icon-${n.value}` : ""), a = t(() => ["svg-icon", e.className].filter(Boolean)), i = t(() => {
      const s = {};
      if (e.color && (s.color = e.color), e.size) {
        const l = typeof e.size == "number" ? `${e.size}px` : e.size;
        s.width = l, s.height = l;
      }
      return s;
    });
    async function r() {
    }
    return f(r), m(n, r), (s, l) => (d(), v("svg", {
      class: _(a.value),
      style: p(i.value),
      "aria-hidden": "true"
    }, [
      g("use", { href: c.value }, null, 8, h)
    ], 6));
  }
}), z = (o, e) => {
  const n = o.__vccOpts || o;
  for (const [c, a] of e)
    n[c] = a;
  return n;
}, N = /* @__PURE__ */ z(y, [["__scopeId", "data-v-f89937e8"]]);
function C(o) {
  return o;
}
export {
  N as SvgIcon,
  N as default,
  C as defineSvgIcons
};
