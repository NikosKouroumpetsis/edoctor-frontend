import{n as e}from"./chunk-DnJy8xQt.js";import{B as t,H as n,M as r,Ot as i,Pt as a,R as o,W as s,X as c,bt as l,c as u,ct as d,ft as f,ht as p,kt as m,mt as h,nt as g,ot as _,q as v,st as y,xt as b}from"./iframe-COaZrb5e.js";import{i as x,n as S,r as C,t as w}from"./create-runtime-stories-HGa4yC6Q.js";import{n as T,t as E}from"./button-BfcwwpiJ.js";import{n as D,r as O,t as k}from"./form-CE7xvLrh.js";import{n as A,t as j}from"./text-field-CKq01OVR.js";import{n as M,t as N}from"./password-field-wE625cjz.js";import{n as P,t as F}from"./number-field-CEV5G8a3.js";import{n as I,t as L}from"./phone-field-DHsCnZPz.js";import{n as R,t as z}from"./phone-field-inline-Bmi2COZK.js";import{n as B,t as V}from"./date-of-birth-field-fak936dl.js";import{n as H,t as U}from"./single-selection-jWoky8VV.js";import{n as W,t as G}from"./multi-selection-DBumPmQ7.js";function K(e,n){b(n,!0);let a=h(null),u=D({initialValues:{fullName:``,email:``,password:``,age:``,phone:``,mobile:``,dob:``,slot:``,languages:[]},validators:{fullName:[O.required,O.minLength(2)],email:[O.required,O.email],password:[O.required,O.minLength(8),O.passwordStrength],slot:[O.required],languages:[O.required]},messages:{password:{minLength:`At least 8 characters`}},onSubmit:e=>{f(a,{...e},!0)}});J(e,{name:`Registration form`,template:e=>{var n=X(),l=y(n),f=_(l);{let e=p(()=>u.field(`fullName`));A(f,{label:`Full name`,get field(){return c(e)},autocomplete:`name`})}var h=d(f,2);{let e=p(()=>u.field(`email`));A(h,{label:`Email`,get field(){return c(e)},type:`email`,autocomplete:`email`})}var b=d(h,2);{let e=p(()=>u.field(`password`));M(b,{get field(){return c(e)},autocomplete:`new-password`})}var x=d(b,2);{let e=p(()=>u.field(`age`));P(x,{label:`Age`,get field(){return c(e)},min:0,max:120})}var S=d(x,2);{let e=p(()=>u.field(`phone`));I(S,{get field(){return c(e)}})}var C=d(S,2);{let e=p(()=>u.field(`mobile`));R(C,{label:`Mobile (inline)`,get field(){return c(e)}})}var w=d(C,2);{let e=p(()=>u.field(`dob`));B(w,{get field(){return c(e)}})}var E=d(w,2);{let e=p(()=>u.field(`slot`));H(E,{label:`Preferred slot`,get field(){return c(e)},options:[{value:`morning`,label:`Morning`},{value:`afternoon`,label:`Afternoon`},{value:`evening`,label:`Evening`}]})}var D=d(E,2);{let e=p(()=>u.field(`languages`));W(D,{label:`Spoken languages`,get field(){return c(e)},options:[{value:`gr`,label:`Greek`},{value:`en`,label:`English`},{value:`de`,label:`German`},{value:`fr`,label:`French`}]})}var O=d(D,2),k=_(O);m(O);var j=d(O,2),N=_(j);T(N,{type:`submit`,children:(e,n)=>{i(),t(e,s(`Create account`))},$$slots:{default:!0}}),T(d(N,2),{type:`button`,variant:`outline`,onclick:()=>u.reset(),children:(e,n)=>{i(),t(e,s(`Reset`))},$$slots:{default:!0}}),m(j),m(l);var F=d(l,2),L=e=>{var n=Y(),r=_(n,!0);m(n),g(e=>o(r,e),[()=>JSON.stringify(c(a),null,2)]),t(e,n)};r(F,e=>{c(a)&&e(L)}),g(()=>o(k,`dirty: ${u.isDirty??``} · submitted: ${u.submitCount??``} ·
				${u.isSubmitting?`submitting…`:`idle`}`)),v(`submit`,l,e=>u.handleSubmit(e)),t(e,n)},$$slots:{template:!0},parameters:{docs:{description:{story:`Component-level analogue of the /test-components Forms section: the full
registration form built from createForm + every field molecule. Submit to
validate; collected values render below.`}},__svelteCsf:{rawCode:`<form class="grid max-w-xl gap-5" onsubmit={(e) => form.handleSubmit(e)} novalidate>
	<TextField label="Full name" field={form.field('fullName')} autocomplete="name" />
	<TextField label="Email" field={form.field('email')} type="email" autocomplete="email" />
	<PasswordField field={form.field('password')} autocomplete="new-password" />
	<NumberField label="Age" field={form.field('age')} min={0} max={120} />
	<PhoneField field={form.field('phone')} />
	<PhoneFieldInline label="Mobile (inline)" field={form.field('mobile')} />
	<DateOfBirthField field={form.field('dob')} />

	<SingleSelection
		label="Preferred slot"
		field={form.field('slot')}
		options={[
			{ value: 'morning', label: 'Morning' },
			{ value: 'afternoon', label: 'Afternoon' },
			{ value: 'evening', label: 'Evening' }
		]}
	/>

	<MultiSelection
		label="Spoken languages"
		field={form.field('languages')}
		options={[
			{ value: 'gr', label: 'Greek' },
			{ value: 'en', label: 'English' },
			{ value: 'de', label: 'German' },
			{ value: 'fr', label: 'French' }
		]}
	/>

	<p class="text-body-sm text-muted-foreground">
		dirty: {form.isDirty} · submitted: {form.submitCount} ·
		{form.isSubmitting ? 'submitting…' : 'idle'}
	</p>

	<div class="flex gap-3">
		<Button type="submit">Create account</Button>
		<Button type="button" variant="outline" onclick={() => form.reset()}>Reset</Button>
	</div>
</form>

{#if submitted}
	<pre
		class="mt-4 overflow-x-auto rounded-control border border-border bg-muted p-4 text-body-sm">{JSON.stringify(
			submitted,
			null,
			2
		)}</pre>
{/if}`}}}),l()}var q,J,Y,X,Z,Q,$;e((()=>{a(),x(),E(),u(),k(),j(),N(),F(),L(),z(),V(),U(),G(),S(),q={title:`Showcases/Registration form`,component:T,tags:[`autodocs`]},{Story:J}=C(q),Y=n(`<pre class="mt-4 overflow-x-auto rounded-control border border-border bg-muted p-4 text-body-sm"> </pre>`),X=n(`<form class="grid max-w-xl gap-5" novalidate=""><!> <!> <!> <!> <!> <!> <!> <!> <!> <p class="text-body-sm text-muted-foreground"> </p> <div class="flex gap-3"><!> <!></div></form> <!>`,1),K.__docgen={data:[],name:`registration-form.stories.svelte`},Z=w(K,q),Q=[`RegistrationForm`],$={...Z.RegistrationForm,tags:[`svelte-csf-v5`]}}))();export{$ as RegistrationForm,Q as __namedExportsOrder,q as default};