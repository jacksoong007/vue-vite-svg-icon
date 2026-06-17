import I from "node:fs/promises";
import h from "node:path";
import F from "fast-glob";
import { baseParse as O } from "@vue/compiler-dom";
import { parse as z } from "@vue/compiler-sfc";
import l from "typescript";
import { optimize as C } from "svgo";
const w = Symbol("unknown");
function B(e) {
  for (; e && (l.isParenthesizedExpression(e) || l.isAsExpression(e) || l.isTypeAssertionExpression(e) || l.isSatisfiesExpression(e) || l.isNonNullExpression(e)); )
    e = e.expression;
  return e;
}
function k(e) {
  return e && (l.isIdentifier(e) || l.isStringLiteral(e)) ? e.text : "";
}
function v(e, t, n = /* @__PURE__ */ new Map()) {
  if (e = B(e), !e) return [w];
  if (l.isStringLiteralLike(e) || l.isNoSubstitutionTemplateLiteral(e)) return [e.text];
  if (l.isArrayLiteralExpression(e))
    return [e.elements.flatMap((s) => v(s, t, n))];
  if (l.isObjectLiteralExpression(e)) {
    const s = {};
    for (const i of e.properties) {
      if (!l.isPropertyAssignment(i) && !l.isShorthandPropertyAssignment(i)) continue;
      const c = k(i.name);
      c && (s[c] = l.isShorthandPropertyAssignment(i) ? t.get(i.name.text) || [w] : v(i.initializer, t, n));
    }
    return [s];
  }
  if (l.isIdentifier(e)) return n.get(e.text) || t.get(e.text) || [w];
  if (l.isPropertyAccessExpression(e)) {
    const s = [];
    for (const i of v(e.expression, t, n).flat(1 / 0))
      i && i !== w && typeof i == "object" ? s.push(...i[e.name.text] || [w]) : s.push(w);
    return s;
  }
  return l.isConditionalExpression(e) ? [...v(e.whenTrue, t, n), ...v(e.whenFalse, t, n)] : l.isBinaryExpression(e) && [l.SyntaxKind.BarBarToken, l.SyntaxKind.QuestionQuestionToken].includes(
    e.operatorToken.kind
  ) ? [...v(e.left, t, n), ...v(e.right, t, n)] : l.isCallExpression(e) && l.isIdentifier(e.expression) && e.expression.text === "defineSvgIcons" ? v(e.arguments[0], t, n) : [w];
}
function R(e) {
  var n, s, i, c;
  return (c = (i = (s = (n = l.createSourceFile(
    "svg-icon-expression.ts",
    `const __value = (${e})`,
    l.ScriptTarget.Latest,
    !0,
    l.ScriptKind.TS
  ).statements[0]) == null ? void 0 : n.declarationList) == null ? void 0 : s.declarations) == null ? void 0 : i[0]) == null ? void 0 : c.initializer;
}
function P(e) {
  const t = /* @__PURE__ */ new Map();
  if (!e) return { env: t, sourceFile: void 0 };
  const n = l.createSourceFile(
    "component.ts",
    e,
    l.ScriptTarget.Latest,
    !0,
    l.ScriptKind.TSX
  );
  for (const s of n.statements)
    if (l.isVariableStatement(s))
      for (const i of s.declarationList.declarations)
        l.isIdentifier(i.name) && i.initializer && t.set(i.name.text, v(i.initializer, t));
  return { env: t, sourceFile: n };
}
function T(e) {
  return [...new Set(e.flat(1 / 0).filter((t) => typeof t == "string"))];
}
function A(e, t, n) {
  const s = [];
  if (!e) return s;
  function i(c) {
    if (l.isCallExpression(c) && l.isIdentifier(c.expression) && c.expression.text === "defineSvgIcons") {
      const u = e.getLineAndCharacterOfPosition(c.getStart()).line + 1;
      for (const p of T(v(c.arguments[0], t)))
        s.push({ name: p, file: n, line: u });
    }
    l.forEachChild(c, i);
  }
  return i(e), s;
}
const K = ["icon-name", "iconName", "icon-class", "iconClass"], W = ["icon-name", "iconName"];
function D(e) {
  var t;
  if (e.type === 6) return e.name;
  if (e.type === 7 && e.name === "bind") return (t = e.arg) == null ? void 0 : t.content;
}
function G(e) {
  const t = e.filter((n) => K.includes(D(n)));
  return t.find((n) => W.includes(D(n))) || t[0];
}
function V(e, t, n) {
  const s = e.match(/^\s*(?:\(([^,)]+).*\)|([^,\s]+))\s+(?:in|of)\s+(.+)$/);
  if (!s) return;
  const i = (s[1] || s[2]).trim(), c = R(s[3]);
  n.set(i, v(c, t, n).flat(1 / 0));
}
function J(e, t, n) {
  const s = [], i = [], c = O(e);
  function u(f, d) {
    for (const g of T(f)) s.push({ name: g, file: n, line: d });
  }
  function p(f, d) {
    var y, S, r;
    if (f.type !== 1 && f.type !== 0) return;
    const g = new Map(d);
    if (f.type === 1) {
      const o = f.props.find((a) => a.type === 7 && a.name === "for");
      if ((y = o == null ? void 0 : o.exp) != null && y.content && V(o.exp.content, t, g), ["svg-icon", "SvgIcon"].includes(f.tag)) {
        const a = G(f.props);
        if ((a == null ? void 0 : a.type) === 6 && ((S = a.value) != null && S.content) && u([a.value.content], a.loc.start.line), (a == null ? void 0 : a.type) === 7 && ((r = a.exp) != null && r.content)) {
          const m = v(R(a.exp.content), t, g);
          u(m, a.loc.start.line), m.flat(1 / 0).includes(w) && i.push({
            file: n,
            line: a.loc.start.line,
            expression: a.exp.content
          });
        }
      }
    }
    for (const o of f.children || []) p(o, g);
  }
  return p(c, /* @__PURE__ */ new Map()), { references: s, diagnostics: i };
}
function Q(e, t) {
  var f, d, g;
  if (!e.endsWith(".vue")) {
    const { env: y, sourceFile: S } = P(t), r = A(S, y, e);
    return { names: r.map((o) => o.name), references: r, diagnostics: [] };
  }
  const { descriptor: n } = z(t, { filename: e }), s = [(f = n.script) == null ? void 0 : f.content, (d = n.scriptSetup) == null ? void 0 : d.content].filter(Boolean).join(`
`), { env: i, sourceFile: c } = P(s), u = J(((g = n.template) == null ? void 0 : g.content) || "", i, e), p = A(c, i, e);
  return u.references.push(...p), p.length && (u.diagnostics = []), u.names = [...new Set(u.references.map((y) => y.name))], u;
}
const N = [".vue", ".ts", ".tsx", ".js", ".jsx"];
function U(e) {
  return l.preProcessFile(e, !0, !0).importedFiles.map((t) => t.fileName).filter(Boolean);
}
function X(e, t) {
  for (const n of t) {
    if (typeof n.find == "string") {
      if (e !== n.find && !e.startsWith(`${n.find}/`)) continue;
      return `${n.replacement}${e.slice(n.find.length)}`;
    }
    if (n.find instanceof RegExp && n.find.test(e))
      return e.replace(n.find, n.replacement);
  }
  return e;
}
async function H(e) {
  try {
    return (await I.stat(e)).isFile();
  } catch {
    return !1;
  }
}
async function q(e, t, n = []) {
  const s = e.replace(/[?#].*$/, ""), i = X(s, n);
  let c;
  if (i.startsWith("."))
    c = h.resolve(h.dirname(t), i);
  else if (h.isAbsolute(i))
    c = i;
  else
    return;
  const p = h.extname(c) ? [c] : [
    ...N.map((f) => `${c}${f}`),
    ...N.map((f) => h.join(c, `index${f}`))
  ];
  for (const f of p)
    if (N.includes(h.extname(f)) && await H(f))
      return h.resolve(f);
}
const Y = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/;
function Z(e, t) {
  return h.relative(e, t).slice(0, -h.extname(t).length).split(h.sep).join("/");
}
async function ee(e) {
  const t = /* @__PURE__ */ new Map(), n = [], s = /* @__PURE__ */ new Map();
  for (const i of e) {
    const c = await F("**/*.svg", { cwd: i, absolute: !0 });
    for (const u of c.sort()) {
      const p = Z(i, u);
      Y.test(p) || n.push(u), t.has(p) ? s.set(p, [...s.get(p) || [t.get(p)], u]) : t.set(p, u);
    }
  }
  if (n.length)
    throw new Error(`[svg-icon] 非法图标文件名:
${n.map((i) => `- ${i}`).join(`
`)}`);
  if (s.size) {
    const i = [...s].map(([c, u]) => `${c}:
${u.map((p) => `- ${p}`).join(`
`)}`).join(`
`);
    throw new Error(`[svg-icon] 图标名称重复:
${i}`);
  }
  return t;
}
function te(e) {
  if (!e.replace(/\*/g, "")) throw new Error('[svg-icon] dynamicPatterns 禁止使用全量匹配规则 "*"');
  const n = e.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${n}$`);
}
function ne(e, t, n = {}) {
  var u, p;
  const s = /* @__PURE__ */ new Set([...t.names, ...n.dynamicIcons || []]);
  for (const f of n.dynamicPatterns || []) {
    const d = te(f);
    for (const g of e.keys())
      d.test(g) && s.add(g);
  }
  const i = [...s].filter((f) => !e.has(f));
  if (i.length) {
    const f = i.map((d) => {
      const g = (t.references || []).filter((y) => y.name === d).map((y) => `${y.file}:${y.line}`);
      return `- ${d}: ${g.join(", ") || "dynamicIcons 配置"}`;
    }).join(`
`);
    throw new Error(`[svg-icon] 找不到图标:
${f}`);
  }
  const c = (((u = n.dynamicIcons) == null ? void 0 : u.length) || 0) > 0 || (((p = n.dynamicPatterns) == null ? void 0 : p.length) || 0) > 0;
  if (n.isBuild && t.diagnostics.length && !c) {
    const f = t.diagnostics.map((d) => `- ${d.file}:${d.line} icon-name/icon-class="${d.expression}"`).join(`
`);
    throw new Error(`[svg-icon] 存在未声明的动态表达式:
${f}`);
  }
  return [...s].sort();
}
async function ie(e, t) {
  const n = await I.readFile(t, "utf8"), { data: s } = C(n, {
    path: t,
    plugins: [
      {
        name: "preset-default",
        params: {
          overrides: {
            removeViewBox: !1,
            cleanupIds: !1
          }
        }
      },
      "removeDimensions",
      {
        name: "prefixIds",
        params: { prefix: `${e.replaceAll("/", "--")}-` }
      }
    ]
  });
  return s.replace(/<svg\b/, `<symbol id="icon-${e}"`).replace(/<\/svg>\s*$/, "</symbol>");
}
async function se(e, t) {
  return (await Promise.all(t.map((s) => ie(s, e.get(s))))).join("");
}
const j = "virtual:svg-icons-register", L = "virtual:svg-icons-names", b = `\0${j}`, _ = `\0${L}`, M = "__svg__icons__dom__";
function re(e) {
  return `
const sprite = ${JSON.stringify(e)}
function loadSvgSprite() {
  if (typeof document === 'undefined') return
  let svg = document.getElementById('${M}')
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.id = '${M}'
    svg.setAttribute('aria-hidden', 'true')
    svg.style.position = 'absolute'
    svg.style.width = '0'
    svg.style.height = '0'
    svg.style.overflow = 'hidden'
    document.body.insertBefore(svg, document.body.firstChild)
  }
  svg.innerHTML = sprite
}
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadSvgSprite, { once: true })
  } else {
    loadSvgSprite()
  }
}
export default {}
`;
}
function oe(e) {
  var t, n;
  return (((t = e.dynamicIcons) == null ? void 0 : t.length) || 0) > 0 || (((n = e.dynamicPatterns) == null ? void 0 : n.length) || 0) > 0;
}
function de(e) {
  const t = e.iconDirs.map((r) => h.resolve(r)), n = e.sourceDirs.map((r) => h.resolve(r));
  let s = !1, i, c = [], u = /* @__PURE__ */ new Set(), p = { names: [], sprite: "" };
  async function f() {
    const r = [];
    for (const m of n)
      r.push(
        ...await F("**/*.{vue,ts,tsx,js,jsx}", {
          cwd: m,
          absolute: !0,
          ignore: ["**/*.d.ts", "**/node_modules/**", "**/dist/**"]
        })
      );
    const o = /* @__PURE__ */ new Set(), a = [...r.sort()];
    for (; a.length; ) {
      const m = h.resolve(a.shift());
      if (o.has(m)) continue;
      o.add(m);
      const E = await I.readFile(m, "utf8");
      for (const $ of U(E)) {
        const x = await q($, m, c);
        x && !o.has(x) && a.push(x);
      }
    }
    return u = o, [...o].sort();
  }
  async function d() {
    const r = await f(), o = [], a = [], m = [];
    for (const E of r.sort()) {
      const $ = await I.readFile(E, "utf8"), x = Q(E, $);
      o.push(...x.names), a.push(...x.diagnostics), m.push(...x.references);
    }
    return { names: [...new Set(o)], diagnostics: a, references: m };
  }
  async function g() {
    const r = await ee(t), o = await d(), a = ne(r, o, {
      dynamicIcons: e.dynamicIcons,
      dynamicPatterns: e.dynamicPatterns,
      isBuild: s
    });
    if (p = {
      names: a,
      diagnostics: o.diagnostics,
      sprite: await se(r, a)
    }, i && i.watcher.add([...u]), !s && o.diagnostics.length && !oe(e))
      for (const m of o.diagnostics)
        console.warn(
          `[svg-icon] 无法静态分析 ${m.file}:${m.line} icon-name/icon-class="${m.expression}"`
        );
  }
  async function y() {
    if (await g(), !!i) {
      for (const r of [b, _]) {
        const o = i.moduleGraph.getModuleById(r);
        o && i.moduleGraph.invalidateModule(o);
      }
      i.ws.send({ type: "full-reload" });
    }
  }
  function S(r) {
    const o = h.resolve(r);
    return u.has(o) || [...t, ...n].some((a) => o.startsWith(`${a}${h.sep}`));
  }
  return {
    name: "vue-vite-svg-icon",
    configResolved(r) {
      var a;
      s = r.command === "build";
      const o = ((a = r.resolve) == null ? void 0 : a.alias) || [];
      c = Array.isArray(o) ? o : Object.entries(o).map(([m, E]) => ({ find: m, replacement: E }));
    },
    async buildStart() {
      await g();
    },
    resolveId(r) {
      if (r === j) return b;
      if (r === L) return _;
    },
    async load(r) {
      if (p.sprite || await g(), r === b) return re(p.sprite);
      if (r === _) return `export default ${JSON.stringify(p.names)}`;
    },
    configureServer(r) {
      i = r, r.watcher.add([...t, ...u]);
      const o = (a) => {
        S(a) && y().catch((m) => r.config.logger.error(m));
      };
      r.watcher.on("add", o), r.watcher.on("change", o), r.watcher.on("unlink", o);
    }
  };
}
function ge() {
  return (e) => {
    if (e === "SvgIcon")
      return "vue-vite-svg-icon/component";
  };
}
export {
  ge as SvgIconResolver,
  de as createSvgIconPlugin
};
