import{n as e}from"./chunk-DnJy8xQt.js";import{B as t,H as n,Ot as r,Pt as i,W as a,X as o,bt as s,c,ct as l,ft as u,ht as d,mt as f,st as p,xt as m}from"./iframe-COaZrb5e.js";import{i as h,n as g,r as _,t as v}from"./create-runtime-stories-HGa4yC6Q.js";import{r as y,t as b}from"./button-BfcwwpiJ.js";import{a as x,c as S,i as C,l as w,n as T,o as E,r as D,s as O,t as k,u as A}from"./dropdown-menu-DL7x_k5h.js";function j(e,n){m(n,!0);let i=f(!0),c=f(!1),h=f(`comfortable`);var g=U(),_=p(g);N(_,{name:`Default`,template:e=>{A(e,{children:(e,n)=>{var i=F(),s=p(i);{let e=d(()=>y({variant:`outline`}));w(s,{get class(){return o(e)},children:(e,n)=>{r(),t(e,a(`Open menu`))},$$slots:{default:!0}})}S(l(s,2),{children:(e,n)=>{var i=P(),o=p(i);D(o,{children:(e,n)=>{r(),t(e,a(`Account`))},$$slots:{default:!0}});var s=l(o,2);O(s,{children:(e,n)=>{r(),t(e,a(`Profile`))},$$slots:{default:!0}});var c=l(s,2);O(c,{children:(e,n)=>{r(),t(e,a(`Settings`))},$$slots:{default:!0}});var u=l(c,2);T(u,{}),O(l(u,2),{children:(e,n)=>{r(),t(e,a(`Log out`))},$$slots:{default:!0}}),t(e,i)},$$slots:{default:!0}}),t(e,i)},$$slots:{default:!0}})},$$slots:{template:!0},parameters:{__svelteCsf:{rawCode:`<DropdownMenu>
	<DropdownMenuTrigger class={buttonVariants({ variant: 'outline' })}>
		Open menu
	</DropdownMenuTrigger>
	<DropdownMenuContent>
		<DropdownMenuLabel>Account</DropdownMenuLabel>
		<DropdownMenuItem>Profile</DropdownMenuItem>
		<DropdownMenuItem>Settings</DropdownMenuItem>
		<DropdownMenuSeparator />
		<DropdownMenuItem>Log out</DropdownMenuItem>
	</DropdownMenuContent>
</DropdownMenu>`}}});var v=l(_,2);N(v,{name:`With checkbox items`,template:e=>{A(e,{children:(e,n)=>{var s=L(),f=p(s);{let e=d(()=>y({variant:`outline`}));w(f,{get class(){return o(e)},children:(e,n)=>{r(),t(e,a(`View`))},$$slots:{default:!0}})}S(l(f,2),{children:(e,n)=>{var s=I(),d=p(s);D(d,{children:(e,n)=>{r(),t(e,a(`Appearance`))},$$slots:{default:!0}});var f=l(d,2);E(f,{get checked(){return o(i)},set checked(e){u(i,e,!0)},children:(e,n)=>{r(),t(e,a(`Show grid`))},$$slots:{default:!0}}),E(l(f,2),{get checked(){return o(c)},set checked(e){u(c,e,!0)},children:(e,n)=>{r(),t(e,a(`Show ruler`))},$$slots:{default:!0}}),t(e,s)},$$slots:{default:!0}}),t(e,s)},$$slots:{default:!0}})},$$slots:{template:!0},parameters:{__svelteCsf:{rawCode:`<DropdownMenu>
	<DropdownMenuTrigger class={buttonVariants({ variant: 'outline' })}>View</DropdownMenuTrigger>
	<DropdownMenuContent>
		<DropdownMenuLabel>Appearance</DropdownMenuLabel>
		<DropdownMenuCheckboxItem bind:checked={showGrid}>Show grid</DropdownMenuCheckboxItem>
		<DropdownMenuCheckboxItem bind:checked={showRuler}>Show ruler</DropdownMenuCheckboxItem>
	</DropdownMenuContent>
</DropdownMenu>`}}});var b=l(v,2);N(b,{name:`With radio group`,template:e=>{A(e,{children:(e,n)=>{var i=B(),s=p(i);{let e=d(()=>y({variant:`outline`}));w(s,{get class(){return o(e)},children:(e,n)=>{r(),t(e,a(`Density`))},$$slots:{default:!0}})}S(l(s,2),{children:(e,n)=>{var i=z(),s=p(i);D(s,{children:(e,n)=>{r(),t(e,a(`Density`))},$$slots:{default:!0}}),x(l(s,2),{get value(){return o(h)},set value(e){u(h,e,!0)},children:(e,n)=>{var i=R(),o=p(i);C(o,{value:`comfortable`,children:(e,n)=>{r(),t(e,a(`Comfortable`))},$$slots:{default:!0}}),C(l(o,2),{value:`compact`,children:(e,n)=>{r(),t(e,a(`Compact`))},$$slots:{default:!0}}),t(e,i)},$$slots:{default:!0}}),t(e,i)},$$slots:{default:!0}}),t(e,i)},$$slots:{default:!0}})},$$slots:{template:!0},parameters:{__svelteCsf:{rawCode:`<DropdownMenu>
	<DropdownMenuTrigger class={buttonVariants({ variant: 'outline' })}>
		Density
	</DropdownMenuTrigger>
	<DropdownMenuContent>
		<DropdownMenuLabel>Density</DropdownMenuLabel>
		<DropdownMenuRadioGroup bind:value={density}>
			<DropdownMenuRadioItem value="comfortable">Comfortable</DropdownMenuRadioItem>
			<DropdownMenuRadioItem value="compact">Compact</DropdownMenuRadioItem>
		</DropdownMenuRadioGroup>
	</DropdownMenuContent>
</DropdownMenu>`}}});var k=l(b,2);N(k,{name:`Destructive item`,template:e=>{A(e,{children:(e,n)=>{var i=H(),s=p(i);{let e=d(()=>y({variant:`outline`}));w(s,{get class(){return o(e)},children:(e,n)=>{r(),t(e,a(`Manage`))},$$slots:{default:!0}})}S(l(s,2),{children:(e,n)=>{var i=V(),o=p(i);O(o,{children:(e,n)=>{r(),t(e,a(`Rename`))},$$slots:{default:!0}});var s=l(o,2);T(s,{}),O(l(s,2),{variant:`destructive`,children:(e,n)=>{r(),t(e,a(`Delete account`))},$$slots:{default:!0}}),t(e,i)},$$slots:{default:!0}}),t(e,i)},$$slots:{default:!0}})},$$slots:{template:!0},parameters:{__svelteCsf:{rawCode:`<DropdownMenu>
	<DropdownMenuTrigger class={buttonVariants({ variant: 'outline' })}>
		Manage
	</DropdownMenuTrigger>
	<DropdownMenuContent>
		<DropdownMenuItem>Rename</DropdownMenuItem>
		<DropdownMenuSeparator />
		<DropdownMenuItem variant="destructive">Delete account</DropdownMenuItem>
	</DropdownMenuContent>
</DropdownMenu>`}}}),t(e,g),s()}var M,N,P,F,I,L,R,z,B,V,H,U,W,G,K,q,J,Y;e((()=>{i(),h(),k(),b(),c(),g(),M={title:`Primitives/Dropdown menu`,component:A,tags:[`autodocs`]},{Story:N}=_(M),P=n(`<!> <!> <!> <!> <!>`,1),F=n(`<!> <!>`,1),I=n(`<!> <!> <!>`,1),L=n(`<!> <!>`,1),R=n(`<!> <!>`,1),z=n(`<!> <!>`,1),B=n(`<!> <!>`,1),V=n(`<!> <!> <!>`,1),H=n(`<!> <!>`,1),U=n(`<!> <!> <!> <!>`,1),j.__docgen={data:[],name:`dropdown-menu.stories.svelte`},W=v(j,M),G=[`Default`,`WithCheckboxItems`,`WithRadioGroup`,`DestructiveItem`],K={...W.Default,tags:[`svelte-csf-v5`]},q={...W.WithCheckboxItems,tags:[`svelte-csf-v5`]},J={...W.WithRadioGroup,tags:[`svelte-csf-v5`]},Y={...W.DestructiveItem,tags:[`svelte-csf-v5`]}}))();export{K as Default,Y as DestructiveItem,q as WithCheckboxItems,J as WithRadioGroup,G as __namedExportsOrder,M as default};