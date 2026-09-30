import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  forwardRef,
  inject,
  Injector,
  input,
  model,
  untracked,
  ViewEncapsulation,
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR, NgControl } from '@angular/forms';
import { TreeNode } from 'primeng/api';
import { TreeSelectModule } from 'primeng/treeselect';

import { ScButtonComponent } from '../button/sc-button.component';
import { ScCheckboxComponent, TriState } from '../checkbox/sc-checkbox.component';

export type ScTreeSelectSize = 'sm' | 'md' | 'lg';
export type ScTreeSelectMode = 'checkbox' | 'multiple' | 'single';
export type ScTreeSelectDisplay = 'comma' | 'chip';
export type ScTreeSelectValue = TreeNode | TreeNode[] | null;

let scTreeSelectIdCounter = 0;

/**
 * Smart Contact tree-select. Wraps PrimeNG `<p-treeselect>` with the SCDS
 * field-pattern chrome (label + required + helper + error).
 *
 * Aligned with Figma `Smart Contact Design System` node 15151:82046: trigger
 * idéntico al de `sc-multiselect`, panel con buscador, nodos con toggle +
 * checkbox + etiqueta + contador, y pie «Seleccionar todo».
 *
 * Soporta cualquier profundidad (p. ej. Ventas / Venta cerrada / Nueva alta):
 * `p-tree` renderiza `children` de forma recursiva y la sangría por nivel sale
 * del token `tree.indent` del preset.
 *
 * Los tokens (`tree.node.*`, `treeselect.*`) ya viven en `sc-preset`; este
 * componente no define ninguno nuevo.
 */
@Component({
  selector: 'sc-treeselect',
  standalone: true,
  imports: [TreeSelectModule, FormsModule, ScCheckboxComponent, ScButtonComponent],
  templateUrl: './sc-treeselect.component.html',
  styleUrl: './sc-treeselect.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ScTreeSelectComponent),
      multi: true,
    },
  ],
  host: {
    class: 'sc-treeselect',
    '[class.sc-treeselect--sm]': "size() === 'sm'",
    '[class.sc-treeselect--lg]': "size() === 'lg'",
    '[class.sc-treeselect--invalid]': 'isInvalid()',
    '[class.sc-treeselect--disabled]': 'disabled()',
  },
})
export class ScTreeSelectComponent implements ControlValueAccessor {
  // ─── Chrome (mirrors sc-multiselect) ───────────────────────────────
  readonly size = input<ScTreeSelectSize>('md');
  readonly label = input<string>();
  readonly required = input(false, { transform: booleanAttribute });
  readonly helperText = input<string>();
  readonly error = input<string>();
  readonly placeholder = input<string>('');
  readonly disabled = model<boolean>(false);
  readonly inputId = input<string>();
  readonly name = input<string>();

  // ─── TreeSelect-specific ───────────────────────────────────────────
  /** Árbol de nodos (`TreeNode[]`). Admite cualquier profundidad. */
  readonly options = input<readonly TreeNode[]>([]);
  /** `checkbox` (Figma) · `multiple` · `single`. */
  readonly selectionMode = input<ScTreeSelectMode>('checkbox');
  readonly display = input<ScTreeSelectDisplay>('comma');
  /** Buscador dentro del panel (presente en Figma). */
  readonly filter = input(true, { transform: booleanAttribute });
  readonly filterPlaceholder = input<string>('');
  /** Contador de hijos directos a la derecha de cada nodo padre (Figma). */
  readonly showCount = input(true, { transform: booleanAttribute });
  /** Pie «Seleccionar todo». Solo aplica con `selectionMode='checkbox'`. */
  readonly showSelectAll = input(true, { transform: booleanAttribute });
  readonly selectAllLabel = input<string>('Seleccionar todo');
  /** Con `display='comma'`, pliega a «N seleccionados» a partir de este número. */
  readonly maxSelectedLabels = input<number>(3);
  /** Plantilla del texto plegado, p. ej. «{0} elementos seleccionados». */
  readonly selectedItemsLabel = input<string>('{0} seleccionados');
  readonly showClear = input(false, { transform: booleanAttribute });
  readonly emptyMessage = input<string>('Sin opciones');

  // ─── Two-way value binding ─────────────────────────────────────────
  /** `TreeNode[]` en `checkbox`/`multiple`; `TreeNode` en `single`. */
  readonly value = model<ScTreeSelectValue>(null);

  // ─── Derived ───────────────────────────────────────────────────────
  protected readonly resolvedId = computed(
    () => this.inputId() ?? `sc-treeselect-${++scTreeSelectIdCounter}`,
  );

  protected readonly isInvalid = computed(() => {
    if (this.error()) return true;
    const ctrl = this._ngControl?.control;
    return !!ctrl && ctrl.invalid && (ctrl.touched || ctrl.dirty);
  });

  protected readonly footerText = computed(() => this.error() || this.helperText() || '');

  protected readonly pSize = computed<'small' | 'large' | undefined>(() => {
    const s = this.size();
    return s === 'sm' ? 'small' : s === 'lg' ? 'large' : undefined;
  });

  protected readonly panelStyleClass = computed(() => {
    const s = this.size();
    return s === 'sm' ? 'sc-treeselect-panel sc-treeselect-panel--sm' : s === 'lg' ? 'sc-treeselect-panel sc-treeselect-panel--lg' : 'sc-treeselect-panel';
  });

  protected readonly optionsMutable = computed(() => this.options() as TreeNode[]);

  protected readonly hasSelectAll = computed(
    () => this.showSelectAll() && this.selectionMode() === 'checkbox',
  );

  /** Todos los nodos del árbol, a cualquier profundidad (orden en profundidad). */
  private readonly allNodes = computed(() => flatten(this.options()));

  protected readonly selectAllState = computed<TriState>(() => {
    const v = this.value();
    const selected = Array.isArray(v) ? v.length : 0;
    const total = this.allNodes().length;
    if (selected === 0) return 'none';
    return selected >= total ? 'all' : 'some';
  });

  constructor() {
    /* El contador se pinta por CSS: cada nodo padre recibe `counter-set` con su
     * nº de hijos directos y una clase marcadora (`p-tree` aplica `style` y
     * `styleClass` al `<li>` del nodo). Anota los nodos en sitio, igual que
     * PrimeNG con `partialSelected`/`expanded`. `style` es string con `;` final
     * porque `p-tree` le concatena su propio `--p-focus-ring-color`. */
    effect(() => {
      const nodes = this.options();
      const show = this.showCount();
      untracked(() => annotateCount(nodes, show));
    });
  }

  // ─── Display ───────────────────────────────────────────────────────
  /** Texto del trigger. Con `comma` pliega a «N seleccionados». */
  protected valueLabel(value: ScTreeSelectValue | undefined): string {
    if (!value) return '';
    const nodes = Array.isArray(value) ? value : [value];
    if (nodes.length === 0) return '';
    if (this.display() === 'comma' && nodes.length > this.maxSelectedLabels()) {
      return this.selectedItemsLabel().replace('{0}', String(nodes.length));
    }
    return nodes.map((n) => n.label).join(', ');
  }

  // ─── Select all ────────────────────────────────────────────────────
  protected onSelectAll(checked: boolean): void {
    if (this.disabled()) return;
    if (checked) {
      const all = this.allNodes();
      all.forEach((n) => (n.partialSelected = false));
      this.onModelChange([...all]);
    } else {
      this.onModelChange([]);
    }
  }

  // ─── ControlValueAccessor ──────────────────────────────────────────
  private _onChange: (v: ScTreeSelectValue) => void = () => {};
  private _onTouched: () => void = () => {};
  private readonly _injector = inject(Injector);
  private get _ngControl(): NgControl | null {
    try {
      return this._injector.get(NgControl, null, { self: true, optional: true });
    } catch {
      return null;
    }
  }

  writeValue(v: ScTreeSelectValue | undefined): void {
    untracked(() => this.value.set(v ?? null));
  }
  registerOnChange(fn: (v: ScTreeSelectValue) => void): void {
    this._onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this._onTouched = fn;
  }
  setDisabledState(state: boolean): void {
    this.disabled.set(state);
  }

  protected onModelChange(v: ScTreeSelectValue): void {
    this.value.set(v ?? null);
    this._onChange(v ?? null);
  }

  protected onBlur(): void {
    this._onTouched();
  }
}

const COUNTER = 'sc-treeselect-count';
const PARENT_CLASS = 'sc-treeselect__node--parent';

function flatten(nodes: readonly TreeNode[]): TreeNode[] {
  return nodes.flatMap((n) => [n, ...flatten(n.children ?? [])]);
}

function annotateCount(nodes: readonly TreeNode[], show: boolean): void {
  for (const node of nodes) {
    const count = node.children?.length ?? 0;
    const classes = (node.styleClass ?? '').split(' ').filter((c) => c && c !== PARENT_CLASS);
    const style = typeof node.style === 'string' ? node.style.replace(new RegExp(`counter-set:\\s*${COUNTER}\\s+\\d+;`), '') : '';
    if (show && count > 0) {
      classes.push(PARENT_CLASS);
      node.style = `${style}counter-set: ${COUNTER} ${count};`;
    } else if (typeof node.style === 'string') {
      node.style = style;
    }
    node.styleClass = classes.join(' ');
    annotateCount(node.children ?? [], show);
  }
}
