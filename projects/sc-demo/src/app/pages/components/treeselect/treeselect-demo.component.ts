import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  signal,
  viewChild,
} from '@angular/core';
import { TreeNode } from 'primeng/api';

import { ScTreeSelectComponent } from '../../../../../../ui-smartcontact/src/public-api';
import { StoryContext, StoryDef, StoryHostComponent, StoryMeta } from '../../../storybook';

const NIVELES_SNIPPET = `<sc-treeselect
  label="Tipificación"
  [options]="nodes"
  placeholder="Selecciona tipificación"
  [(value)]="value" />`;

const ESTADOS_SNIPPET = `<sc-treeselect label="Sin contador" [options]="nodes" [showCount]="false" />
<sc-treeselect label="Selección simple" [options]="nodes" selectionMode="single" />
<sc-treeselect label="Con error" [options]="nodes" error="Selecciona al menos uno" />`;

/** Demo de `sc-treeselect` en formato story (motor «Storybook-like»). */
@Component({
  selector: 'app-treeselect-demo',
  imports: [ScTreeSelectComponent, StoryHostComponent],
  templateUrl: './treeselect-demo.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TreeSelectDemoComponent {
  protected readonly playgroundTpl = viewChild<TemplateRef<StoryContext>>('playground');
  protected readonly nivelesTpl = viewChild<TemplateRef<StoryContext>>('niveles');
  protected readonly estadosTpl = viewChild<TemplateRef<StoryContext>>('estados');

  /** Tres niveles: Ventas › Venta cerrada › Nueva alta. */
  readonly nodes: TreeNode[] = [
    {
      key: 'consulta',
      label: 'Consulta',
      children: [
        { key: 'consulta-resuelta', label: 'Consulta resuelta' },
        { key: 'consulta-escalada', label: 'Consulta escalada' },
        { key: 'info-proporcionada', label: 'Información proporcionada' },
      ],
    },
    {
      key: 'ventas',
      label: 'Ventas',
      expanded: true,
      children: [
        {
          key: 'venta-cerrada',
          label: 'Venta cerrada',
          expanded: true,
          children: [
            { key: 'nueva-alta', label: 'Nueva alta' },
            { key: 'portabilidad', label: 'Portabilidad' },
          ],
        },
        { key: 'renovacion', label: 'Renovación' },
        { key: 'venta-pendiente', label: 'Venta pendiente' },
        { key: 'venta-rechazada', label: 'Venta rechazada' },
      ],
    },
  ];

  readonly value = signal<TreeNode[] | TreeNode | null>(null);

  protected readonly meta: StoryMeta = {
    tag: 'sc-treeselect',
    title: 'TreeSelect',
    description:
      'Selector jerárquico sobre `p-treeselect` con la chrome del field-pattern. Admite cualquier profundidad (p. ej. Ventas › Venta cerrada › Nueva alta), buscador, contador de hijos por nodo padre y pie «Seleccionar todo».',
    argTypes: [
      { name: 'label', control: { kind: 'text' } },
      { name: 'placeholder', control: { kind: 'text' } },
      { name: 'helperText', control: { kind: 'text' } },
      { name: 'error', control: { kind: 'text' } },
      { name: 'selectionMode', control: { kind: 'select', options: ['checkbox', 'multiple', 'single'] } },
      { name: 'display', control: { kind: 'select', options: ['comma', 'chip'] } },
      { name: 'size', control: { kind: 'select', options: ['sm', 'md', 'lg'] } },
      { name: 'required', control: { kind: 'boolean' } },
      { name: 'filter', control: { kind: 'boolean' } },
      { name: 'showCount', control: { kind: 'boolean' } },
      { name: 'showSelectAll', control: { kind: 'boolean' } },
      { name: 'showClear', control: { kind: 'boolean' } },
      { name: 'disabled', control: { kind: 'boolean' } },
    ],
    defaultArgs: {
      label: 'Tipificación',
      placeholder: 'Selecciona tipificación',
      helperText: '',
      error: '',
      selectionMode: 'checkbox',
      display: 'comma',
      size: 'md',
      required: false,
      filter: true,
      showCount: true,
      showSelectAll: true,
      showClear: false,
      disabled: false,
    },
    props: [
      { name: 'value', type: 'TreeNode | TreeNode[] | null', default: 'null', description: 'Two-way `[(value)]`. Array en `checkbox`/`multiple`; nodo en `single`.' },
      { name: 'options', type: 'TreeNode[]', default: '[]', description: 'Árbol de nodos, cualquier profundidad.' },
      { name: 'selectionMode', type: 'ScTreeSelectMode', default: "'checkbox'", description: 'checkbox · multiple · single' },
      { name: 'display', type: 'ScTreeSelectDisplay', default: "'comma'", description: 'chip · comma' },
      { name: 'label', type: 'string', default: '—' },
      { name: 'placeholder', type: 'string', default: "''" },
      { name: 'size', type: 'ScTreeSelectSize', default: "'md'", description: 'sm · md · lg' },
      { name: 'helperText', type: 'string', default: '—' },
      { name: 'error', type: 'string', default: '—', description: 'Texto de error (gana a helper).' },
      { name: 'required', type: 'boolean', default: 'false' },
      { name: 'filter', type: 'boolean', default: 'true', description: 'Buscador dentro del panel.' },
      { name: 'filterPlaceholder', type: 'string', default: "''" },
      { name: 'showCount', type: 'boolean', default: 'true', description: 'Nº de hijos directos en cada nodo padre. Anota `style`/`styleClass` de los nodos.' },
      { name: 'showSelectAll', type: 'boolean', default: 'true', description: 'Pie «Seleccionar todo» (solo `checkbox`).' },
      { name: 'selectAllLabel', type: 'string', default: "'Seleccionar todo'" },
      { name: 'maxSelectedLabels', type: 'number', default: '3', description: 'Pliega a «N seleccionados» (comma).' },
      { name: 'selectedItemsLabel', type: 'string', default: "'{0} seleccionados'" },
      { name: 'showClear', type: 'boolean', default: 'false', description: 'Botón «×» para limpiar.' },
      { name: 'emptyMessage', type: 'string', default: "'Sin opciones'" },
      { name: 'disabled', type: 'boolean', default: 'false' },
    ],
  };

  protected readonly stories = computed<readonly StoryDef[]>(() => {
    const pg = this.playgroundTpl();
    const ni = this.nivelesTpl();
    const es = this.estadosTpl();
    if (!pg || !ni || !es) return [];
    return [
      { name: 'Playground', playground: true, template: pg },
      { name: 'Tres niveles', template: ni, snippet: NIVELES_SNIPPET },
      { name: 'Estados', template: es, snippet: ESTADOS_SNIPPET },
    ];
  });
}
