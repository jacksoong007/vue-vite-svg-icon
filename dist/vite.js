import E from "node:fs/promises";
import h from "node:path";
import M from "fast-glob";
import { baseParse as z } from "@vue/compiler-dom";
import { parse as C } from "@vue/compiler-sfc";
import l from "typescript";
import { optimize as O } from "svgo";
const v = Symbol("unknown");
function R(e) {
  for (; e && (l.isParenthesizedExpression(e) || l.isAsExpression(e) || l.isTypeAssertionExpression(e) || l.isSatisfiesExpression(e) || l.isNonNullExpression(e)); )
    e = e.expression;
  return e;
}
function B(e) {
  return e && (l.isIdentifier(e) || l.isStringLiteral(e)) ? e.text : "";
}
function w(e, t, n = /* @__PURE__ */ new Map()) {
  if (e = R(e), !e) return [v];
  if (l.isStringLiteralLike(e) || l.isNoSubstitutionTemplateLiteral(e)) return [e.text];
  if (l.isArrayLiteralExpression(e))
    return [e.elements.flatMap((i) => w(i, t, n))];
  if (l.isObjectLiteralExpression(e)) {
    const i = {};
    for (const s of e.properties) {
      if (!l.isPropertyAssignment(s) && !l.isShorthandPropertyAssignment(s)) continue;
      const c = B(s.name);
      c && (i[c] = l.isShorthandPropertyAssignment(s) ? t.get(s.name.text) || [v] : w(s.initializer, t, n));
    }
    return [i];
  }
  if (l.isIdentifier(e)) return n.get(e.text) || t.get(e.text) || [v];
  if (l.isPropertyAccessExpression(e)) {
    const i = [];
    for (const s of w(e.expression, t, n).flat(1 / 0))
      s && s !== v && typeof s == "object" ? i.push(...s[e.name.text] || [v]) : i.push(v);
    return i;
  }
  return l.isConditionalExpression(e) ? [...w(e.whenTrue, t, n), ...w(e.whenFalse, t, n)] : l.isBinaryExpression(e) && [l.SyntaxKind.BarBarToken, l.SyntaxKind.QuestionQuestionToken].includes(
    e.operatorToken.kind
  ) ? [...w(e.left, t, n), ...w(e.right, t, n)] : l.isCallExpression(e) && l.isIdentifier(e.expression) && e.expression.text === "defineSvgIcons" ? w(e.arguments[0], t, n) : [v];
}
function T(e) {
  var n, i, s, c;
  return (c = (s = (i = (n = l.createSourceFile(
    "svg-icon-expression.ts",
    `const __value = (${e})`,
    l.ScriptTarget.Latest,
    !0,
    l.ScriptKind.TS
  ).statements[0]) == null ? void 0 : n.declarationList) == null ? void 0 : i.declarations) == null ? void 0 : s[0]) == null ? void 0 : c.initializer;
}
function _(e) {
  const t = /* @__PURE__ */ new Map();
  if (!e) return { env: t, sourceFile: void 0 };
  const n = l.createSourceFile(
    "component.ts",
    e,
    l.ScriptTarget.Latest,
    !0,
    l.ScriptKind.TSX
  );
  for (const i of n.statements)
    if (l.isVariableStatement(i))
      for (const s of i.declarationList.declarations)
        l.isIdentifier(s.name) && s.initializer && t.set(s.name.text, w(s.initializer, t));
  return { env: t, sourceFile: n };
}
function F(e) {
  return [...new Set(e.flat(1 / 0).filter((t) => typeof t == "string"))];
}
function j(e, t, n) {
  const i = [];
  if (!e) return i;
  function s(c) {
    if (l.isCallExpression(c) && l.isIdentifier(c.expression) && c.expression.text === "defineSvgIcons") {
      const u = e.getLineAndCharacterOfPosition(c.getStart()).line + 1;
      for (const p of F(w(c.arguments[0], t)))
        i.push({ name: p, file: n, line: u });
    }
    l.forEachChild(c, s);
  }
  return s(e), i;
}
function k(e, t, n) {
  const i = e.match(/^\s*(?:\(([^,)]+).*\)|([^,\s]+))\s+(?:in|of)\s+(.+)$/);
  if (!i) return;
  const s = (i[1] || i[2]).trim(), c = T(i[3]);
  n.set(s, w(c, t, n).flat(1 / 0));
}
function K(e, t, n) {
  const i = [], s = [], c = z(e);
  function u(f, d) {
    for (const g of F(f)) i.push({ name: g, file: n, line: d });
  }
  function p(f, d) {
    var y, $, r;
    if (f.type !== 1 && f.type !== 0) return;
    const g = new Map(d);
    if (f.type === 1) {
      const o = f.props.find((a) => a.type === 7 && a.name === "for");
      if ((y = o == null ? void 0 : o.exp) != null && y.content && k(o.exp.content, t, g), ["svg-icon", "SvgIcon"].includes(f.tag)) {
        const a = f.props.find((m) => {
          var x;
          return m.type === 6 ? ["icon-class", "iconClass"].includes(m.name) : m.type === 7 && m.name === "bind" && ["icon-class", "iconClass"].includes((x = m.arg) == null ? void 0 : x.content);
        });
        if ((a == null ? void 0 : a.type) === 6 && (($ = a.value) != null && $.content) && u([a.value.content], a.loc.start.line), (a == null ? void 0 : a.type) === 7 && ((r = a.exp) != null && r.content)) {
          const m = w(T(a.exp.content), t, g);
          u(m, a.loc.start.line), m.flat(1 / 0).includes(v) && s.push({
            file: n,
            line: a.loc.start.line,
            expression: a.exp.content
          });
        }
      }
    }
    for (const o of f.children || []) p(o, g);
  }
  return p(c, /* @__PURE__ */ new Map()), { references: i, diagnostics: s };
}
function W(e, t) {
  var f, d, g;
  if (!e.endsWith(".vue")) {
    const { env: y, sourceFile: $ } = _(t), r = j($, y, e);
    return { names: r.map((o) => o.name), references: r, diagnostics: [] };
  }
  const { descriptor: n } = C(t, { filename: e }), i = [(f = n.script) == null ? void 0 : f.content, (d = n.scriptSetup) == null ? void 0 : d.content].filter(Boolean).join(`
`), { env: s, sourceFile: c } = _(i), u = K(((g = n.template) == null ? void 0 : g.content) || "", s, e), p = j(c, s, e);
  return u.references.push(...p), p.length && (u.diagnostics = []), u.names = [...new Set(u.references.map((y) => y.name))], u;
}
const b = [".vue", ".ts", ".tsx", ".js", ".jsx"];
function G(e) {
  return l.preProcessFile(e, !0, !0).importedFiles.map((t) => t.fileName).filter(Boolean);
}
function V(e, t) {
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
async function J(e) {
  try {
    return (await E.stat(e)).isFile();
  } catch {
    return !1;
  }
}
async function Q(e, t, n = []) {
  const i = e.replace(/[?#].*$/, ""), s = V(i, n);
  let c;
  if (s.startsWith("."))
    c = h.resolve(h.dirname(t), s);
  else if (h.isAbsolute(s))
    c = s;
  else
    return;
  const p = h.extname(c) ? [c] : [
    ...b.map((f) => `${c}${f}`),
    ...b.map((f) => h.join(c, `index${f}`))
  ];
  for (const f of p)
    if (b.includes(h.extname(f)) && await J(f))
      return h.resolve(f);
}
const U = /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/;
function X(e, t) {
  return h.relative(e, t).slice(0, -h.extname(t).length).split(h.sep).join("/");
}
async function H(e) {
  const t = /* @__PURE__ */ new Map(), n = [], i = /* @__PURE__ */ new Map();
  for (const s of e) {
    const c = await M("**/*.svg", { cwd: s, absolute: !0 });
    for (const u of c.sort()) {
      const p = X(s, u);
      U.test(p) || n.push(u), t.has(p) ? i.set(p, [...i.get(p) || [t.get(p)], u]) : t.set(p, u);
    }
  }
  if (n.length)
    throw new Error(`[svg-icon] 非法图标文件名:
${n.map((s) => `- ${s}`).join(`
`)}`);
  if (i.size) {
    const s = [...i].map(([c, u]) => `${c}:
${u.map((p) => `- ${p}`).join(`
`)}`).join(`
`);
    throw new Error(`[svg-icon] 图标名称重复:
${s}`);
  }
  return t;
}
function q(e) {
  if (!e.replace(/\*/g, "")) throw new Error('[svg-icon] dynamicPatterns 禁止使用全量匹配规则 "*"');
  const n = e.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${n}$`);
}
function Y(e, t, n = {}) {
  var u, p;
  const i = /* @__PURE__ */ new Set([...t.names, ...n.dynamicIcons || []]);
  for (const f of n.dynamicPatterns || []) {
    const d = q(f);
    for (const g of e.keys())
      d.test(g) && i.add(g);
  }
  const s = [...i].filter((f) => !e.has(f));
  if (s.length) {
    const f = s.map((d) => {
      const g = (t.references || []).filter((y) => y.name === d).map((y) => `${y.file}:${y.line}`);
      return `- ${d}: ${g.join(", ") || "dynamicIcons 配置"}`;
    }).join(`
`);
    throw new Error(`[svg-icon] 找不到图标:
${f}`);
  }
  const c = (((u = n.dynamicIcons) == null ? void 0 : u.length) || 0) > 0 || (((p = n.dynamicPatterns) == null ? void 0 : p.length) || 0) > 0;
  if (n.isBuild && t.diagnostics.length && !c) {
    const f = t.diagnostics.map((d) => `- ${d.file}:${d.line} icon-class="${d.expression}"`).join(`
`);
    throw new Error(`[svg-icon] 存在未声明的动态表达式:
${f}`);
  }
  return [...i].sort();
}
async function Z(e, t) {
  const n = await E.readFile(t, "utf8"), { data: i } = O(n, {
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
  return i.replace(/<svg\b/, `<symbol id="icon-${e}"`).replace(/<\/svg>\s*$/, "</symbol>");
}
async function ee(e, t) {
  return (await Promise.all(t.map((i) => Z(i, e.get(i))))).join("");
}
const L = "virtual:svg-icons-register", P = "virtual:svg-icons-names", A = `\0${L}`, N = `\0${P}`, D = "__svg__icons__dom__";
function te(e) {
  return `
const sprite = ${JSON.stringify(e)}
function loadSvgSprite() {
  if (typeof document === 'undefined') return
  let svg = document.getElementById('${D}')
  if (!svg) {
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.id = '${D}'
    svg.setAttribute('aria-hidden', 'true')
    svg.style.position = 'absolute'
    svg.style.width = '0'
    svg.style.height = '0'
    svg.style.overflow = 'hidden'
    document.body.insertBefore(svg, document.body.firstChild)
  }
  svg.innerHTML = sprite
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadSvgSprite, { once: true })
} else {
  loadSvgSprite()
}
export default {}
`;
}
function ne(e) {
  var t, n;
  return (((t = e.dynamicIcons) == null ? void 0 : t.length) || 0) > 0 || (((n = e.dynamicPatterns) == null ? void 0 : n.length) || 0) > 0;
}
function fe(e) {
  const t = e.iconDirs.map((r) => h.resolve(r)), n = e.sourceDirs.map((r) => h.resolve(r));
  let i = !1, s, c = [], u = /* @__PURE__ */ new Set(), p = { names: [], sprite: "" };
  async function f() {
    const r = [];
    for (const m of n)
      r.push(
        ...await M("**/*.{vue,ts,tsx,js,jsx}", {
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
      const x = await E.readFile(m, "utf8");
      for (const I of G(x)) {
        const S = await Q(I, m, c);
        S && !o.has(S) && a.push(S);
      }
    }
    return u = o, [...o].sort();
  }
  async function d() {
    const r = await f(), o = [], a = [], m = [];
    for (const x of r.sort()) {
      const I = await E.readFile(x, "utf8"), S = W(x, I);
      o.push(...S.names), a.push(...S.diagnostics), m.push(...S.references);
    }
    return { names: [...new Set(o)], diagnostics: a, references: m };
  }
  async function g() {
    const r = await H(t), o = await d(), a = Y(r, o, {
      dynamicIcons: e.dynamicIcons,
      dynamicPatterns: e.dynamicPatterns,
      isBuild: i
    });
    if (p = {
      names: a,
      diagnostics: o.diagnostics,
      sprite: await ee(r, a)
    }, s && s.watcher.add([...u]), !i && o.diagnostics.length && !ne(e))
      for (const m of o.diagnostics)
        console.warn(
          `[svg-icon] 无法静态分析 ${m.file}:${m.line} icon-class="${m.expression}"`
        );
  }
  async function y() {
    if (await g(), !!s) {
      for (const r of [A, N]) {
        const o = s.moduleGraph.getModuleById(r);
        o && s.moduleGraph.invalidateModule(o);
      }
      s.ws.send({ type: "full-reload" });
    }
  }
  function $(r) {
    const o = h.resolve(r);
    return u.has(o) || [...t, ...n].some((a) => o.startsWith(`${a}${h.sep}`));
  }
  return {
    name: "dsj:svg-icon-library",
    configResolved(r) {
      var a;
      i = r.command === "build";
      const o = ((a = r.resolve) == null ? void 0 : a.alias) || [];
      c = Array.isArray(o) ? o : Object.entries(o).map(([m, x]) => ({ find: m, replacement: x }));
    },
    async buildStart() {
      await g();
    },
    resolveId(r) {
      if (r === L) return A;
      if (r === P) return N;
    },
    async load(r) {
      if (p.sprite || await g(), r === A) return te(p.sprite);
      if (r === N) return `export default ${JSON.stringify(p.names)}`;
    },
    configureServer(r) {
      s = r, r.watcher.add([...t, ...u]);
      const o = (a) => {
        $(a) && y().catch((m) => r.config.logger.error(m));
      };
      r.watcher.on("add", o), r.watcher.on("change", o), r.watcher.on("unlink", o);
    }
  };
}
function ue() {
  return (e) => {
    if (e === "SvgIcon")
      return "@dsj/svg-icon/component";
  };
}
export {
  ue as SvgIconResolver,
  fe as createSvgIconPlugin
};
