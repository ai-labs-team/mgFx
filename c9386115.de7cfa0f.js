/*! For license information please see c9386115.de7cfa0f.js.LICENSE.txt */
(window.webpackJsonp=window.webpackJsonp||[]).push([[23],{162:function(e,t,n){"use strict";n.r(t),n.d(t,"frontMatter",(function(){return s})),n.d(t,"metadata",(function(){return c})),n.d(t,"rightToc",(function(){return p})),n.d(t,"default",(function(){return m}));var a=n(1),r=n(9),o=(n(0),n(172)),i=n(187),l=n(186),s={title:"Validation"},c={id:"guide/validation",title:"Validation",description:"In the last chapter, we created a Task Definition that uses the built-in `mgFx.validate.void` Validator to express that our Task is void of Input or Output. Let's take a moment to 'poke' at this Definition some more to learn about how mgFx enforces your constraints at both design-time and run-time.",source:"@site/docs/guide/validation.md",permalink:"/mgFx/docs/guide/validation",editUrl:"https://github.com/ai-labs-team/mgFx/edit/master/website/docs/guide/validation.md",sidebar:"someSidebar",previous:{title:"Getting Started",permalink:"/mgFx/docs/guide/getting-started"}},p=[{value:"Validation in Depth",id:"validation-in-depth",children:[]}],u={rightToc:p};function m(e){var t=e.components,n=Object(r.a)(e,["components"]);return Object(o.b)("wrapper",Object(a.a)({},u,n,{components:t,mdxType:"MDXLayout"}),Object(o.b)("p",null,"In the last chapter, we created a Task Definition that uses the built-in ",Object(o.b)("inlineCode",{parentName:"p"},"mgFx.validate.void")," Validator to express that our Task is void of Input or Output. Let's take a moment to 'poke' at this Definition some more to learn about how mgFx enforces your constraints at both design-time and run-time."),Object(o.b)("p",null,"First, attempt to violate the Input constraint at design-time by specifying a parameter when running the Task:"),Object(o.b)("pre",null,Object(o.b)("code",Object(a.a)({parentName:"pre"},{className:"language-typescript"}),"// Argument of type '99' is not assignable to parameter of type 'string'.\nconnector.run(sayHello(99)).fork(console.error, console.log);\n")),Object(o.b)("p",null,"Then, attempt to violate the Output constraint at design-time by attempting to return a value from within the Task Implementation:"),Object(o.b)("pre",null,Object(o.b)("code",Object(a.a)({parentName:"pre"},{className:"language-typescript"}),"// Type 'number' is not assignable to type 'string | FutureInstance<any, string>'.\nconst sayHelloImplementation = mgFx.implement(sayHello, () => {\n  return 99;\n});\n")),Object(o.b)("p",null,"The TypeScript types used by mgFx have been carefully constructed to ensure that strong type-checking is presented to programmers in the most useful, accurate and insightful manner possible. For the sake of argument, let's throw all that work into the wind in order to test how these constraints are enforced at run-time. Use the dreaded ",Object(o.b)("inlineCode",{parentName:"p"},"as any")," type assertion to force TypeScript to ignore an intentional error:"),Object(o.b)("pre",null,Object(o.b)("code",Object(a.a)({parentName:"pre"},{className:"language-typescript",metastring:"file=./validation-1.ts",file:"./validation-1.ts"}),"import * as mgFx from 'mgfx';\n\nconst connector = mgFx.localConnector();\n\nconst sayHello = mgFx.define({\n  name: 'sayHello',\n  input: mgFx.validate.string,\n  output: mgFx.validate.string,\n});\n\n// highlight-start\nconst sayHelloImplementation = mgFx.implement(sayHello, (name) => {\n  return 99 as any;\n});\n// highlight-end\n\nconnector.serve(sayHelloImplementation);\n\nconnector.run(sayHello('World')).fork(console.error, console.log);\n")),Object(o.b)("p",null,"Observe that mgFx will still catch this error at runtime:"),Object(o.b)("pre",null,Object(o.b)("code",Object(a.a)({parentName:"pre"},{}),"$ ./node_modules/.bin/ts-node hello-world.ts\nOutputValidationError:\n{\n    errors: '99 is not a string!'\n}\n")),Object(o.b)("p",null,'By being consistently strict about types, mgFx applications are very robust. This is especially true for applications which involve interacting with data provided by third parties over which you have little or no control -- "Hell is other people(\'s data)."'),Object(o.b)("h2",{id:"validation-in-depth"},"Validation in Depth"),Object(o.b)("p",null,"If you examine the Validators that are built into the mgFx core, you will that they only offer validation of simple types - strings, numbers and ",Object(o.b)("inlineCode",{parentName:"p"},"void"),". Any 'real' application is going to require far more than this; indeed, the mgFx core only provides these validators as a means of getting up-and-running quickly."),Object(o.b)("p",null,"Although the mgFx core provides the mechanism for enforcing constraints described by Validators, the Validators themselves are extremely pluggable. We provide an additional module named ",Object(o.b)("inlineCode",{parentName:"p"},"@mgfx/validator-iots")," that allows the use of the ",Object(o.b)("a",Object(a.a)({parentName:"p"},{href:"https://github.com/gcanti/io-ts"}),"io-ts")," library to check more complex types."),Object(o.b)("p",null,"Let's install ",Object(o.b)("inlineCode",{parentName:"p"},"@mgfx/validator-iots")," into our application:"),Object(o.b)(i.a,{groupId:"package-manager",values:[{label:"npm",value:"npm"},{label:"Yarn",value:"yarn"}],mdxType:"Tabs"},Object(o.b)(l.a,{value:"npm",mdxType:"TabItem"},Object(o.b)("pre",null,Object(o.b)("code",Object(a.a)({parentName:"pre"},{className:"language-bash"}),"npm install @mgfx/validator-iots\n"))),Object(o.b)(l.a,{value:"yarn",mdxType:"TabItem"},Object(o.b)("pre",null,Object(o.b)("code",Object(a.a)({parentName:"pre"},{className:"language-bash"}),"yarn add @mgfx/validator-iots\n")))),Object(o.b)("p",null,"Then, we'll import ",Object(o.b)("inlineCode",{parentName:"p"},"ioTs")," and ",Object(o.b)("inlineCode",{parentName:"p"},"t")," from this module. While we're in here, let's restore a working implementation for ",Object(o.b)("inlineCode",{parentName:"p"},"sayHello"),":"),Object(o.b)("pre",null,Object(o.b)("code",Object(a.a)({parentName:"pre"},{className:"language-typescript",metastring:"file=./validation-2.ts",file:"./validation-2.ts"}),"import * as mgFx from 'mgfx';\n// highlight-next-line\nimport { ioTs, t } from '@mgfx/validator-iots';\n\nconst connector = mgFx.localConnector();\n\nconst sayHello = mgFx.define({\n  name: 'sayHello',\n  // highlight-start\n  input: ioTs(t.string),\n  output: ioTs(t.string),\n  // highlight-end\n});\n\nconst sayHelloImplementation = mgFx.implement(sayHello, (name) => {\n  // highlight-next-line\n  return `Hello, ${name}!`;\n});\n\nconnector.serve(sayHelloImplementation);\n\nconnector.run(sayHello('World')).fork(console.error, console.log);\n")),Object(o.b)("p",null,"Here, we are using the ",Object(o.b)("inlineCode",{parentName:"p"},"ioTs")," function to 'wrap' an io-ts validator (re-exported as ",Object(o.b)("inlineCode",{parentName:"p"},"t")," for convenience) as an mgFx compatible one. Of course, the astute will notice that ",Object(o.b)("inlineCode",{parentName:"p"},"ioTs(t.string)")," is essentially the equivalent of ",Object(o.b)("inlineCode",{parentName:"p"},"mgFx.validate.string"),". However, ",Object(o.b)("inlineCode",{parentName:"p"},"t")," provides a plethora of 'combinators' that map well to their TypeScript equivalents."),Object(o.b)("p",null,"As previously mentioned, mgFx's Validators are extremely pluggable; you are welcome to write adapters for other libraries (such as ",Object(o.b)("a",Object(a.a)({parentName:"p"},{href:"https://github.com/vriad/zod"}),"Zod")," or ",Object(o.b)("a",Object(a.a)({parentName:"p"},{href:"https://github.com/ai-labs-team/ts-utils#decoder"}),"TS Utils Decoder"),".) It is even possible to write extremely specific Validators for high-performance applications."),Object(o.b)("p",null,"For now, let's take a look at how one might write a Task Definition for a slightly more complex type:"),Object(o.b)("pre",null,Object(o.b)("code",Object(a.a)({parentName:"pre"},{className:"language-typescript"}),"mgFx.define({\n  name: 'reticulateSplines',\n  input: ioTs(\n    t.array(\n      t.type({\n        timeout: t.number,\n        precision: t.union([t.literal('high'), t.literal('low')]),\n        spline: t.number,\n      })\n    )\n  ),\n  output: ioTs(\n    t.array(\n      t.type({\n        spline: t.number,\n        timeTaken: t.number,\n        result: t.union([t.literal('volatile'), t.literal('safe')]),\n      })\n    )\n  ),\n});\n")))}m.isMDXComponent=!0},172:function(e,t,n){"use strict";n.d(t,"a",(function(){return u})),n.d(t,"b",(function(){return d}));var a=n(0),r=n.n(a);function o(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function i(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);t&&(a=a.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,a)}return n}function l(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?i(Object(n),!0).forEach((function(t){o(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):i(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function s(e,t){if(null==e)return{};var n,a,r=function(e,t){if(null==e)return{};var n,a,r={},o=Object.keys(e);for(a=0;a<o.length;a++)n=o[a],t.indexOf(n)>=0||(r[n]=e[n]);return r}(e,t);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(e);for(a=0;a<o.length;a++)n=o[a],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(r[n]=e[n])}return r}var c=r.a.createContext({}),p=function(e){var t=r.a.useContext(c),n=t;return e&&(n="function"==typeof e?e(t):l({},t,{},e)),n},u=function(e){var t=p(e.components);return r.a.createElement(c.Provider,{value:t},e.children)},m={inlineCode:"code",wrapper:function(e){var t=e.children;return r.a.createElement(r.a.Fragment,{},t)}},b=Object(a.forwardRef)((function(e,t){var n=e.components,a=e.mdxType,o=e.originalType,i=e.parentName,c=s(e,["components","mdxType","originalType","parentName"]),u=p(n),b=a,d=u["".concat(i,".").concat(b)]||u[b]||m[b]||o;return n?r.a.createElement(d,l({ref:t},c,{components:n})):r.a.createElement(d,l({ref:t},c))}));function d(e,t){var n=arguments,a=t&&t.mdxType;if("string"==typeof e||a){var o=n.length,i=new Array(o);i[0]=b;var l={};for(var s in t)hasOwnProperty.call(t,s)&&(l[s]=t[s]);l.originalType=e,l.mdxType="string"==typeof e?e:a,i[1]=l;for(var c=2;c<o;c++)i[c]=n[c];return r.a.createElement.apply(null,i)}return r.a.createElement.apply(null,n)}b.displayName="MDXCreateElement"},173:function(e,t,n){var a;!function(){"use strict";var n={}.hasOwnProperty;function r(){for(var e=[],t=0;t<arguments.length;t++){var a=arguments[t];if(a){var o=typeof a;if("string"===o||"number"===o)e.push(a);else if(Array.isArray(a)&&a.length){var i=r.apply(null,a);i&&e.push(i)}else if("object"===o)for(var l in a)n.call(a,l)&&a[l]&&e.push(l)}}return e.join(" ")}e.exports?(r.default=r,e.exports=r):void 0===(a=function(){return r}.apply(t,[]))||(e.exports=a)}()},179:function(e,t,n){"use strict";var a=n(0),r=Object(a.createContext)({tabGroupChoices:{},setTabGroupChoices:function(){}});t.a=r},186:function(e,t,n){"use strict";var a=n(0),r=n.n(a);t.a=function(e){return r.a.createElement("div",null,e.children)}},187:function(e,t,n){"use strict";n(25),n(19),n(20);var a=n(0),r=n.n(a),o=n(179);var i=function(){return Object(a.useContext)(o.a)},l=n(173),s=n.n(l),c=n(132),p=n.n(c),u=37,m=39;t.a=function(e){var t=e.block,n=e.children,o=e.defaultValue,l=e.values,c=e.groupId,b=i(),d=b.tabGroupChoices,g=b.setTabGroupChoices,h=Object(a.useState)(o),f=h[0],y=h[1];if(null!=c){var v=d[c];null!=v&&v!==f&&y(v)}var O=function(e){y(e),null!=c&&g(c,e)},j=[];return r.a.createElement("div",null,r.a.createElement("ul",{role:"tablist","aria-orientation":"horizontal",className:s()("tabs",{"tabs--block":t})},l.map((function(e){var t=e.value,n=e.label;return r.a.createElement("li",{role:"tab",tabIndex:"0","aria-selected":f===t,className:s()("tab-item",p.a.tabItem,{"tab-item--active":f===t}),key:t,ref:function(e){return j.push(e)},onKeyDown:function(e){return function(e,t,n){switch(n.keyCode){case m:!function(e,t){var n=e.indexOf(t)+1;e[n]?e[n].focus():e[0].focus()}(e,t);break;case u:!function(e,t){var n=e.indexOf(t)-1;e[n]?e[n].focus():e[e.length-1].focus()}(e,t)}}(j,e.target,e)},onFocus:function(){return O(t)},onClick:function(){return O(t)}},n)}))),r.a.createElement("div",{role:"tabpanel",className:"margin-vert--md"},a.Children.toArray(n).filter((function(e){return e.props.value===f}))[0]))}}}]);