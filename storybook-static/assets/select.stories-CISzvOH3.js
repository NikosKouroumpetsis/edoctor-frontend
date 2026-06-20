import{n as e}from"./chunk-DnJy8xQt.js";import{A as t,B as n,H as r,Ot as i,Pt as a,W as o,X as s,bt as c,c as l,ct as u,ft as d,ht as f,kt as p,mt as m,st as h,xt as g}from"./iframe-COaZrb5e.js";import{i as _,n as v,r as y,t as b}from"./create-runtime-stories-HGa4yC6Q.js";import{a as x,c as S,i as C,l as w,n as T,o as E,r as D,s as O,t as k}from"./select-BhVOnYev.js";function A(e,r){g(r,!0);let a=m(``),l=m(`derma`),_=m(``),v=m(``);var y=G(),b=h(y);M(b,{name:`Default`,template:e=>{w(e,{name:`specialty`,get value(){return s(a)},set value(e){d(a,e,!0)},children:(e,t)=>{var r=P(),a=h(r);S(a,{class:`w-64`,"aria-label":`Specialty`,children:(e,t)=>{O(e,{placeholder:`Pick a specialty`})},$$slots:{default:!0}}),E(u(a,2),{children:(e,t)=>{var r=N(),a=h(r);x(a,{value:`cardio`,children:(e,t)=>{i(),n(e,o(`Cardiology`))},$$slots:{default:!0}});var s=u(a,2);x(s,{value:`derma`,children:(e,t)=>{i(),n(e,o(`Dermatology`))},$$slots:{default:!0}}),x(u(s,2),{value:`neuro`,children:(e,t)=>{i(),n(e,o(`Neurology`))},$$slots:{default:!0}}),n(e,r)},$$slots:{default:!0}}),n(e,r)},$$slots:{default:!0}})},$$slots:{template:!0},parameters:{__svelteCsf:{rawCode:`<Select bind:value name="specialty">
	<SelectTrigger class="w-64" aria-label="Specialty">
		<SelectValue placeholder="Pick a specialty" />
	</SelectTrigger>
	<SelectContent>
		<SelectItem value="cardio">Cardiology</SelectItem>
		<SelectItem value="derma">Dermatology</SelectItem>
		<SelectItem value="neuro">Neurology</SelectItem>
	</SelectContent>
</Select>`}}});var k=u(b,2);M(k,{name:`Pre-selected`,template:e=>{w(e,{name:`specialty-pre`,get value(){return s(l)},set value(e){d(l,e,!0)},children:(e,t)=>{var r=I(),a=h(r);S(a,{class:`w-64`,"aria-label":`Specialty`,children:(e,t)=>{O(e,{placeholder:`Pick a specialty`})},$$slots:{default:!0}}),E(u(a,2),{children:(e,t)=>{var r=F(),a=h(r);x(a,{value:`cardio`,children:(e,t)=>{i(),n(e,o(`Cardiology`))},$$slots:{default:!0}});var s=u(a,2);x(s,{value:`derma`,children:(e,t)=>{i(),n(e,o(`Dermatology`))},$$slots:{default:!0}}),x(u(s,2),{value:`neuro`,children:(e,t)=>{i(),n(e,o(`Neurology`))},$$slots:{default:!0}}),n(e,r)},$$slots:{default:!0}}),n(e,r)},$$slots:{default:!0}})},$$slots:{template:!0},parameters:{__svelteCsf:{rawCode:`<Select bind:value={preselected} name="specialty-pre">
	<SelectTrigger class="w-64" aria-label="Specialty">
		<SelectValue placeholder="Pick a specialty" />
	</SelectTrigger>
	<SelectContent>
		<SelectItem value="cardio">Cardiology</SelectItem>
		<SelectItem value="derma">Dermatology</SelectItem>
		<SelectItem value="neuro">Neurology</SelectItem>
	</SelectContent>
</Select>`}}});var A=u(k,2);M(A,{name:`Grouped + separator`,template:e=>{w(e,{name:`city`,get value(){return s(_)},set value(e){d(_,e,!0)},children:(e,t)=>{var r=B(),a=h(r);S(a,{class:`w-64`,"aria-label":`City`,children:(e,t)=>{O(e,{placeholder:`Pick a city`})},$$slots:{default:!0}}),E(u(a,2),{children:(e,t)=>{var r=z(),a=h(r);C(a,{children:(e,t)=>{var r=L(),a=h(r);D(a,{children:(e,t)=>{i(),n(e,o(`Greece`))},$$slots:{default:!0}});var s=u(a,2);x(s,{value:`ath`,children:(e,t)=>{i(),n(e,o(`Athens`))},$$slots:{default:!0}}),x(u(s,2),{value:`skg`,children:(e,t)=>{i(),n(e,o(`Thessaloniki`))},$$slots:{default:!0}}),n(e,r)},$$slots:{default:!0}});var s=u(a,2);T(s,{}),C(u(s,2),{children:(e,t)=>{var r=R(),a=h(r);D(a,{children:(e,t)=>{i(),n(e,o(`Cyprus`))},$$slots:{default:!0}}),x(u(a,2),{value:`nic`,children:(e,t)=>{i(),n(e,o(`Nicosia`))},$$slots:{default:!0}}),n(e,r)},$$slots:{default:!0}}),n(e,r)},$$slots:{default:!0}}),n(e,r)},$$slots:{default:!0}})},$$slots:{template:!0},parameters:{__svelteCsf:{rawCode:`<Select bind:value={grouped} name="city">
	<SelectTrigger class="w-64" aria-label="City">
		<SelectValue placeholder="Pick a city" />
	</SelectTrigger>
	<SelectContent>
		<SelectGroup>
			<SelectLabel>Greece</SelectLabel>
			<SelectItem value="ath">Athens</SelectItem>
			<SelectItem value="skg">Thessaloniki</SelectItem>
		</SelectGroup>
		<SelectSeparator />
		<SelectGroup>
			<SelectLabel>Cyprus</SelectLabel>
			<SelectItem value="nic">Nicosia</SelectItem>
		</SelectGroup>
	</SelectContent>
</Select>`}}});var j=u(A,2);M(j,{name:`Sizes`,template:e=>{var r=U();t(r,20,()=>[`sm`,`default`,`lg`,`xl`],e=>e,(e,t)=>{{let r=f(()=>`size-${t}`);w(e,{get name(){return s(r)},get value(){return s(v)},set value(e){d(v,e,!0)},children:(e,r)=>{var a=H(),s=h(a);S(s,{get size(){return t},class:`w-64`,get"aria-label"(){return t},children:(e,n)=>{O(e,{get placeholder(){return t}})},$$slots:{default:!0}}),E(u(s,2),{children:(e,t)=>{var r=V(),a=h(r);x(a,{value:`cardio`,children:(e,t)=>{i(),n(e,o(`Cardiology`))},$$slots:{default:!0}}),x(u(a,2),{value:`derma`,children:(e,t)=>{i(),n(e,o(`Dermatology`))},$$slots:{default:!0}}),n(e,r)},$$slots:{default:!0}}),n(e,a)},$$slots:{default:!0}})}}),p(r),n(e,r)},$$slots:{template:!0},parameters:{__svelteCsf:{rawCode:`<div class="flex flex-col gap-3">
	{#each ['sm', 'default', 'lg', 'xl'] as const as s (s)}
		<Select bind:value={sizes} name={\`size-\${s}\`}>
			<SelectTrigger size={s} class="w-64" aria-label={s}>
				<SelectValue placeholder={s} />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="cardio">Cardiology</SelectItem>
				<SelectItem value="derma">Dermatology</SelectItem>
			</SelectContent>
		</Select>
	{/each}
</div>`}}});var K=u(j,2);M(K,{name:`Disabled`,template:e=>{w(e,{value:``,name:`specialty-disabled`,disabled:!0,children:(e,t)=>{var r=W(),a=h(r);S(a,{class:`w-64`,"aria-label":`Specialty`,children:(e,t)=>{O(e,{placeholder:`Disabled`})},$$slots:{default:!0}}),E(u(a,2),{children:(e,t)=>{x(e,{value:`cardio`,children:(e,t)=>{i(),n(e,o(`Cardiology`))},$$slots:{default:!0}})},$$slots:{default:!0}}),n(e,r)},$$slots:{default:!0}})},$$slots:{template:!0},parameters:{__svelteCsf:{rawCode:`<Select value="" name="specialty-disabled" disabled>
	<SelectTrigger class="w-64" aria-label="Specialty">
		<SelectValue placeholder="Disabled" />
	</SelectTrigger>
	<SelectContent>
		<SelectItem value="cardio">Cardiology</SelectItem>
	</SelectContent>
</Select>`}}}),n(e,y),c()}var j,M,N,P,F,I,L,R,z,B,V,H,U,W,G,K,q,J,Y,X,Z,Q;e((()=>{a(),_(),k(),l(),v(),j={title:`Primitives/Select`,component:w,tags:[`autodocs`]},{Story:M}=y(j),N=r(`<!> <!> <!>`,1),P=r(`<!> <!>`,1),F=r(`<!> <!> <!>`,1),I=r(`<!> <!>`,1),L=r(`<!> <!> <!>`,1),R=r(`<!> <!>`,1),z=r(`<!> <!> <!>`,1),B=r(`<!> <!>`,1),V=r(`<!> <!>`,1),H=r(`<!> <!>`,1),U=r(`<div class="flex flex-col gap-3"></div>`),W=r(`<!> <!>`,1),G=r(`<!> <!> <!> <!> <!>`,1),A.__docgen={data:[],name:`select.stories.svelte`},K=b(A,j),q=[`Default`,`PreSelected`,`GroupedSeparator`,`Sizes`,`Disabled`],J={...K.Default,tags:[`svelte-csf-v5`]},Y={...K.PreSelected,tags:[`svelte-csf-v5`]},X={...K.GroupedSeparator,tags:[`svelte-csf-v5`]},Z={...K.Sizes,tags:[`svelte-csf-v5`]},Q={...K.Disabled,tags:[`svelte-csf-v5`]}}))();export{J as Default,Q as Disabled,X as GroupedSeparator,Y as PreSelected,Z as Sizes,q as __namedExportsOrder,j as default};