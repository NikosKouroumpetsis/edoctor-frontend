import{n as e}from"./chunk-DnJy8xQt.js";import{A as t,B as n,H as r,Ot as i,Pt as a,R as o,W as s,X as c,bt as l,c as u,ct as d,ht as f,kt as p,nt as m,ot as h,st as g,xt as _}from"./iframe-COaZrb5e.js";import{i as v,n as y,r as b,t as x}from"./create-runtime-stories-HGa4yC6Q.js";import{r as S,t as C}from"./button-BfcwwpiJ.js";import{i as w,n as T,r as E,t as D}from"./popover-DdNIG-E3.js";function O(e,r){_(r,!0);var a=V(),u=g(a);N(u,{name:`Default`,template:e=>{w(e,{children:(e,t)=>{var r=F(),a=g(r);{let e=f(()=>S({variant:`outline`}));E(a,{get class(){return c(e)},children:(e,t)=>{i(),n(e,s(`Open popover`))},$$slots:{default:!0}})}T(d(a,2),{class:`w-64`,children:(e,t)=>{n(e,P())},$$slots:{default:!0}}),n(e,r)},$$slots:{default:!0}})},$$slots:{template:!0},parameters:{__svelteCsf:{rawCode:`<Popover>
	<PopoverTrigger class={buttonVariants({ variant: 'outline' })}>Open popover</PopoverTrigger>
	<PopoverContent class="w-64">
		<p class="text-body-sm">Set your notification preferences here.</p>
	</PopoverContent>
</Popover>`}}});var v=d(u,2);N(v,{name:`Placement variants`,template:e=>{var r=R();t(r,20,()=>[`top`,`bottom`,`left`,`right`],e=>e,(e,t)=>{w(e,{children:(e,r)=>{var a=L(),l=g(a);{let e=f(()=>S({variant:`outline`}));E(l,{get class(){return c(e)},children:(e,r)=>{i();var a=s();m(()=>o(a,t)),n(e,a)},$$slots:{default:!0}})}T(d(l,2),{get placement(){return t},class:`w-40`,children:(e,r)=>{var i=I(),a=h(i);p(i),m(()=>o(a,`Placed ${t??``}.`)),n(e,i)},$$slots:{default:!0}}),n(e,a)},$$slots:{default:!0}})}),p(r),n(e,r)},$$slots:{template:!0},parameters:{__svelteCsf:{rawCode:`<div class="flex flex-wrap gap-3">
	{#each ['top', 'bottom', 'left', 'right'] as const as placement (placement)}
		<Popover>
			<PopoverTrigger class={buttonVariants({ variant: 'outline' })}>{placement}</PopoverTrigger
			>
			<PopoverContent {placement} class="w-40">
				<p class="text-body-sm">Placed {placement}.</p>
			</PopoverContent>
		</Popover>
	{/each}
</div>`}}});var y=d(v,2);N(y,{name:`Opened`,play:async({canvas:e})=>{await A.click(e.getByRole(`button`,{name:`Open popover`})),await k(await j.findByText(`Set your notification preferences here.`)).toBeVisible()},template:e=>{w(e,{children:(e,t)=>{var r=B(),a=g(r);{let e=f(()=>S({variant:`outline`}));E(a,{get class(){return c(e)},children:(e,t)=>{i(),n(e,s(`Open popover`))},$$slots:{default:!0}})}T(d(a,2),{class:`w-64`,children:(e,t)=>{n(e,z())},$$slots:{default:!0}}),n(e,r)},$$slots:{default:!0}})},$$slots:{template:!0},parameters:{__svelteCsf:{rawCode:`<Popover>
	<PopoverTrigger class={buttonVariants({ variant: 'outline' })}>Open popover</PopoverTrigger>
	<PopoverContent class="w-64">
		<p class="text-body-sm">Set your notification preferences here.</p>
	</PopoverContent>
</Popover>`}}}),n(e,a),l()}var k,A,j,M,N,P,F,I,L,R,z,B,V,H,U,W,G,K;e((()=>{a(),v(),D(),C(),u(),y(),{expect:k,userEvent:A,screen:j}=__STORYBOOK_MODULE_TEST__,M={title:`Primitives/Popover`,component:w,tags:[`autodocs`]},{Story:N}=b(M),P=r(`<p class="text-body-sm">Set your notification preferences here.</p>`),F=r(`<!> <!>`,1),I=r(`<p class="text-body-sm"> </p>`),L=r(`<!> <!>`,1),R=r(`<div class="flex flex-wrap gap-3"></div>`),z=r(`<p class="text-body-sm">Set your notification preferences here.</p>`),B=r(`<!> <!>`,1),V=r(`<!> <!> <!>`,1),O.__docgen={data:[],name:`popover.stories.svelte`},H=x(O,M),U=[`Default`,`PlacementVariants`,`Opened`],W={...H.Default,tags:[`svelte-csf-v5`]},G={...H.PlacementVariants,tags:[`svelte-csf-v5`]},K={...H.Opened,tags:[`svelte-csf-v5`]}}))();export{W as Default,K as Opened,G as PlacementVariants,U as __namedExportsOrder,M as default};