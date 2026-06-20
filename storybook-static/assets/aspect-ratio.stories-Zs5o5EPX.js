import{n as e}from"./chunk-DnJy8xQt.js";import{B as t,H as n,I as r,Mt as i,Pt as a,bt as o,c as s,ct as c,f as l,h as u,kt as d,l as f,ot as p,st as m,u as h,xt as g}from"./iframe-COaZrb5e.js";import{i as _,n as v,r as y,t as b}from"./create-runtime-stories-HGa4yC6Q.js";import{n as x,t as S}from"./utils-BvJoj25T.js";function C(e,n){g(n,!0);let a=f(n,`ref`,15,null),s=f(n,`ratio`,3,1),c=h(n,[`$$slots`,`$$events`,`$$legacy`,`ref`,`class`,`ratio`,`children`]);var m=w();u(m,e=>({"data-slot":`aspect-ratio`,style:`aspect-ratio: ${s()};`,class:e,...c}),[()=>S(`relative w-full`,n.class)]),r(p(m),()=>n.children??i),d(m),l(m,e=>a(e),()=>a()),t(e,m),o()}var w,T=e((()=>{a(),s(),x(),w=n(`<div><!></div>`),C.__docgen={data:[{name:`ref`,visibility:`public`,keywords:[],kind:`let`,type:{kind:`type`,type:`object`,text:`HTMLElement`},static:!1,readonly:!1,defaultValue:`...`},{name:`ratio`,visibility:`public`,keywords:[],kind:`let`,type:{kind:`type`,type:`number`,text:`number`},static:!1,readonly:!1,defaultValue:`1`}],name:`aspect-ratio.svelte`}})),E=e((()=>{T()}));function D(e,n){g(n,!0);var r=I(),i=m(r);k(i,{name:`Ratio 16:9`,template:e=>{var n=j();C(p(n),{ratio:16/9,class:`overflow-hidden rounded-md bg-muted`,children:(e,n)=>{t(e,A())},$$slots:{default:!0}}),d(n),t(e,n)},$$slots:{template:!0},parameters:{__svelteCsf:{rawCode:`<div class="w-80">
	<AspectRatio ratio={16 / 9} class="overflow-hidden rounded-md bg-muted">
		<div class="flex size-full items-center justify-center text-body-sm text-muted-foreground">
			16 : 9
		</div>
	</AspectRatio>
</div>`}}});var a=c(i,2);k(a,{name:`Square 1:1`,template:e=>{var n=N();C(p(n),{ratio:1,class:`overflow-hidden rounded-md bg-muted`,children:(e,n)=>{t(e,M())},$$slots:{default:!0}}),d(n),t(e,n)},$$slots:{template:!0},parameters:{__svelteCsf:{rawCode:`<div class="w-60">
	<AspectRatio ratio={1} class="overflow-hidden rounded-md bg-muted">
		<div class="flex size-full items-center justify-center text-body-sm text-muted-foreground">
			1 : 1
		</div>
	</AspectRatio>
</div>`}}});var s=c(a,2);k(s,{name:`Ratio 4:3 (with image)`,template:e=>{var n=F();C(p(n),{ratio:4/3,class:`overflow-hidden rounded-md bg-muted`,children:(e,n)=>{t(e,P())},$$slots:{default:!0}}),d(n),t(e,n)},$$slots:{template:!0},parameters:{__svelteCsf:{rawCode:`<div class="w-80">
	<AspectRatio ratio={4 / 3} class="overflow-hidden rounded-md bg-muted">
		<img
			src="https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=640&q=80"
			alt="A doctor reviewing a patient chart"
			class="size-full object-cover"
		/>
	</AspectRatio>
</div>`}}}),t(e,r),o()}var O,k,A,j,M,N,P,F,I,L,R,z,B,V;e((()=>{a(),_(),E(),s(),v(),O={title:`Primitives/Aspect ratio`,component:C,tags:[`autodocs`]},{Story:k}=y(O),A=n(`<div class="flex size-full items-center justify-center text-body-sm text-muted-foreground">16 : 9</div>`),j=n(`<div class="w-80"><!></div>`),M=n(`<div class="flex size-full items-center justify-center text-body-sm text-muted-foreground">1 : 1</div>`),N=n(`<div class="w-60"><!></div>`),P=n(`<img src="https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=640&amp;q=80" alt="A doctor reviewing a patient chart" class="size-full object-cover"/>`),F=n(`<div class="w-80"><!></div>`),I=n(`<!> <!> <!>`,1),D.__docgen={data:[],name:`aspect-ratio.stories.svelte`},L=b(D,O),R=[`Ratio169`,`Square11`,`Ratio43WithImage`],z={...L.Ratio169,tags:[`svelte-csf-v5`]},B={...L.Square11,tags:[`svelte-csf-v5`]},V={...L.Ratio43WithImage,tags:[`svelte-csf-v5`]}}))();export{z as Ratio169,V as Ratio43WithImage,B as Square11,R as __namedExportsOrder,O as default};