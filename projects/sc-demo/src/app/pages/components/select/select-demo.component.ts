import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  signal,
  viewChild,
} from '@angular/core';
import { PrimeTemplate } from 'primeng/api';

import { ScSelectComponent } from '../../../../../../ui-smartcontact/src/public-api';
import { PrefixSearchDemoComponent } from './prefix-search-demo.component';
import { StoryContext, StoryDef, StoryHostComponent, StoryMeta } from '../../../storybook';

const OBJETOS_SNIPPET = `<sc-select
  label="Prioridad (objetos + pTemplate)"
  [options]="objOptions"
  optionLabel="name"
  optionValue="id"
  placeholder="Elige prioridad"
>
  <ng-template pTemplate="item" let-opt>★ {{ opt.name }}</ng-template>
</sc-select>`;

const AGRUPADO_SNIPPET = `<!-- Cada hijo lleva \`country\` y \`label\` (el prefijo); filterBy busca en ambos: «Canadá» o «1873» -->
<sc-select
  label="Prefijo"
  [options]="prefijos"
  optionGroupLabel="label"
  optionGroupChildren="items"
  optionLabel="label"
  optionValue="value"
  filterBy="label,country"
  [filter]="true"
  placeholder="Selecciona país"
>
  <ng-template pTemplate="selectedItem" let-opt>{{ opt.country }} ( {{ opt.label }} )</ng-template>
</sc-select>`;

const MIXTO_SNIPPET = `<!-- Lista plana: cabecera (deshabilitada) solo si el país tiene varios prefijos; con uno, fila normal.
     keywords = país + prefijos: «canad» o «1809» mantienen la cabecera junto a sus filas -->
<sc-select
  label="Prefijo"
  [options]="prefijosMixto"
  optionLabel="label"
  optionValue="value"
  optionDisabled="isHeader"
  filterBy="keywords"
  [filter]="true"
  placeholder="Selecciona país"
>
  <ng-template pTemplate="item" let-opt>
    @if (opt.kind === 'header') { <strong>{{ opt.flag }} {{ opt.country }}</strong> }
    @else if (opt.kind === 'prefix') { <span class="prefix-row">{{ opt.prefix }}</span> }
    @else { {{ opt.flag }} {{ opt.country }} ( {{ opt.prefix }} ) }
  </ng-template>
  <ng-template pTemplate="selectedItem" let-opt>{{ opt.flag }} {{ opt.country }} ( {{ opt.prefix }} )</ng-template>
</sc-select>`;

const BUSQUEDA_SNIPPET = `<!-- País (sc-select) + prefijo editable (p-autocomplete) + tipo + buscador -->
<sc-select [options]="countries" optionLabel="name" filterBy="keywords" [filter]="true"
           [value]="country()" (valueChange)="onCountry($event)" />

<p-autocomplete [ngModel]="prefix()" (ngModelChange)="onPrefixModel($event)"
                [suggestions]="suggestions()" (completeMethod)="searchPrefix($event)"
                (onSelect)="onPrefixSelect($event)"
                [dropdown]="true" dropdownMode="blank" [completeOnFocus]="true" [minLength]="0" />

<sc-inputgroup>
  <input pInputText [ngModel]="number()" (ngModelChange)="number.set($event)" (keydown.enter)="search()" />
  <sc-button icon="search" iconAriaLabel="Buscar" (clicked)="search()" />
</sc-inputgroup>`;

const ESTADOS_SNIPPET =`<sc-select label="Con clear + filtro" [options]="groups" [showClear]="true" [filter]="true" placeholder="Buscar…" />
<sc-select label="Con error" [options]="groups" error="Selecciona un grupo" />
<sc-select label="Small" [options]="groups" size="sm" placeholder="sm" />
<sc-select label="Deshabilitado" [options]="groups" [disabled]="true" placeholder="off" />`;

/** Demo de `sc-select` en formato story (motor «Storybook-like»). */
@Component({
  selector: 'app-select-demo',
  imports: [ScSelectComponent, PrimeTemplate, StoryHostComponent, PrefixSearchDemoComponent],
  templateUrl: './select-demo.component.html',
  styles: [`.prefix-row { padding-left: var(--sc-spacing-0-875); }`],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectDemoComponent {
  protected readonly playgroundTpl = viewChild<TemplateRef<StoryContext>>('playground');
  protected readonly objetosTpl = viewChild<TemplateRef<StoryContext>>('objetos');
  protected readonly agrupadoTpl = viewChild<TemplateRef<StoryContext>>('agrupado');
  protected readonly mixtoTpl = viewChild<TemplateRef<StoryContext>>('mixto');
  protected readonly busquedaTpl = viewChild<TemplateRef<StoryContext>>('busqueda');
  protected readonly estadosTpl = viewChild<TemplateRef<StoryContext>>('estados');

  readonly groups = ['Soporte', 'Ventas', 'Postventa', 'Calidad'];
  readonly objOptions = [
    { name: 'Alta', id: 'high' },
    { name: 'Media', id: 'mid' },
    { name: 'Baja', id: 'low' },
  ];
  /** Prefijos independientes por país: cada fila lleva `country` aparte para filtrar por él sin repetirlo en pantalla. */
  readonly prefijos = [
    { label: 'Canadá', items: this.prefijosDe('Canadá', ['1428', '1431', '1437', '1438', '1450', '1460', '1807', '1873', '1879', '1902', '1905', '1942']) },
    { label: 'España', items: this.prefijosDe('España', ['34']) },
    { label: 'Reino Unido', items: this.prefijosDe('Reino Unido', ['44']) },
    { label: 'República Dominicana', items: this.prefijosDe('República Dominicana', ['1809', '1829', '1849']) },
    { label: 'Rumania', items: this.prefijosDe('Rumania', ['40']) },
  ];

  /** Lista plana como la devolvería la API: una fila por (país, prefijo). */
  private readonly telefonos: { country: string; flag: string; prefix: string }[] = [
    ...['+1428', '+1431', '+1437', '+1438', '+1450', '+1460', '+1807', '+1873', '+1879', '+1902', '+1905', '+1942'].map((prefix) => ({ country: 'Canadá', flag: '🇨🇦', prefix })),
    { country: 'España', flag: '🇪🇸', prefix: '+34' },
    { country: 'Francia', flag: '🇫🇷', prefix: '+33' },
    { country: 'Reino Unido', flag: '🇬🇧', prefix: '+44' },
    ...['+1809', '+1829', '+1849'].map((prefix) => ({ country: 'República Dominicana', flag: '🇩🇴', prefix })),
    { country: 'Rumania', flag: '🇷🇴', prefix: '+40' },
  ];

  /**
   * Cabecera (no seleccionable) solo para países con varios prefijos; con uno,
   * una única fila «País ( +prefijo )». `keywords` lleva país + prefijos para
   * que el filtro plano conserve la cabecera al buscar por prefijo.
   */
  readonly prefijosMixto = (() => {
    const byCountry = new Map<string, string[]>();
    const flags = new Map<string, string>();
    for (const t of this.telefonos) {
      byCountry.set(t.country, [...(byCountry.get(t.country) ?? []), t.prefix]);
      flags.set(t.country, t.flag);
    }
    const out: Record<string, unknown>[] = [];
    for (const [country, prefixes] of byCountry) {
      if (prefixes.length === 1) {
        out.push({ kind: 'single', country, flag: flags.get(country), prefix: prefixes[0], label: `${country} ( ${prefixes[0]} )`, value: prefixes[0], keywords: `${country} ${prefixes[0]}`, isHeader: false });
        continue;
      }
      out.push({ kind: 'header', country, flag: flags.get(country), label: country, value: `header:${country}`, keywords: `${country} ${prefixes.join(' ')}`, isHeader: true });
      for (const prefix of prefixes) {
        out.push({ kind: 'prefix', country, flag: flags.get(country), prefix, label: prefix, value: prefix, keywords: `${country} ${prefix}`, isHeader: false });
      }
    }
    return out;
  })();

  private prefijosDe(country: string, prefijos: string[]) {
    return prefijos.map((p) => ({ country, label: `+${p}`, value: `+${p}` }));
  }
  readonly value = signal<string>('');

  protected readonly meta: StoryMeta = {
    tag: 'sc-select',
    title: 'Select',
    description:
      'Select / dropdown sobre `p-select` con la chrome del field-pattern (label + requerido + helper/error). Options como `string[]` u objetos (`optionLabel`/`optionValue`). Acepta `<ng-template pTemplate="item">` para render custom de las opciones.',
    argTypes: [
      { name: 'label', control: { kind: 'text' } },
      { name: 'placeholder', control: { kind: 'text' } },
      { name: 'helperText', control: { kind: 'text' } },
      { name: 'error', control: { kind: 'text' } },
      { name: 'size', control: { kind: 'select', options: ['sm', 'md', 'lg'] } },
      { name: 'required', control: { kind: 'boolean' } },
      { name: 'showClear', control: { kind: 'boolean' } },
      { name: 'filter', control: { kind: 'boolean' } },
      { name: 'filled', control: { kind: 'boolean' } },
      { name: 'iftaLabel', control: { kind: 'boolean' } },
      { name: 'disabled', control: { kind: 'boolean' } },
      { name: 'loading', control: { kind: 'boolean' } },
    ],
    defaultArgs: {
      label: 'Grupo',
      placeholder: 'Selecciona',
      helperText: '',
      error: '',
      size: 'md',
      required: false,
      showClear: false,
      filter: false,
      filled: false,
      iftaLabel: false,
      disabled: false,
      loading: false,
    },
    props: [
      { name: 'value', type: 'unknown', default: 'undefined', description: 'Two-way `[(value)]`.' },
      { name: 'options', type: 'unknown[]', default: '[]', description: 'string[] u objetos.' },
      { name: 'optionLabel', type: 'string', default: "'label'", description: 'Clave de la etiqueta (objetos).' },
      { name: 'optionValue', type: 'string', default: '—', description: 'Clave del valor (objetos).' },
      { name: 'optionGroupLabel', type: 'string', default: '—', description: 'Activa el modo agrupado: clave de la cabecera del grupo.' },
      { name: 'optionGroupChildren', type: 'string', default: "'items'", description: 'Clave del array de hijos de cada grupo.' },
      { name: 'label', type: 'string', default: '—' },
      { name: 'placeholder', type: 'string', default: "''" },
      { name: 'size', type: 'ScSelectSize', default: "'md'", description: 'sm · md · lg' },
      { name: 'helperText', type: 'string', default: '—' },
      { name: 'error', type: 'string', default: '—', description: 'Texto de error (gana a helper).' },
      { name: 'required', type: 'boolean', default: 'false' },
      { name: 'showClear', type: 'boolean', default: 'false', description: 'Botón «×» para limpiar.' },
      { name: 'filter', type: 'boolean', default: 'false', description: 'Buscador dentro del panel.' },
      { name: 'filled', type: 'boolean', default: 'false', description: 'Fondo slate-50.' },
      { name: 'iftaLabel', type: 'boolean', default: 'false', description: 'Label dentro del campo.' },
      { name: 'disabled', type: 'boolean', default: 'false' },
      { name: 'loading', type: 'boolean', default: 'false', description: 'Spinner de carga.' },
      { name: 'focused', type: 'EventEmitter<FocusEvent>' },
      { name: 'blurred', type: 'EventEmitter<FocusEvent>' },
    ],
  };

  protected readonly stories = computed<readonly StoryDef[]>(() => {
    const pg = this.playgroundTpl();
    const ob = this.objetosTpl();
    const ag = this.agrupadoTpl();
    const mx = this.mixtoTpl();
    const bq = this.busquedaTpl();
    const es = this.estadosTpl();
    if (!pg || !ob || !ag || !mx || !bq || !es) return [];
    return [
      { name: 'Playground', playground: true, template: pg },
      { name: 'Objetos + pTemplate', template: ob, snippet: OBJETOS_SNIPPET },
      { name: 'Agrupado + filtro', template: ag, snippet: AGRUPADO_SNIPPET },
      { name: 'Mixto: cabecera solo si hay varios', template: mx, snippet: MIXTO_SNIPPET },
      { name: 'Búsqueda: país + prefijo editable', template: bq, snippet: BUSQUEDA_SNIPPET },
      { name: 'Estados y tamaños', template: es, snippet: ESTADOS_SNIPPET },
    ];
  });
}
