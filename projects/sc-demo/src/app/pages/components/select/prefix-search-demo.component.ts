import { ChangeDetectionStrategy, Component, ElementRef, ViewEncapsulation, computed, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PrimeTemplate } from 'primeng/api';
import { AutoComplete, AutoCompleteCompleteEvent, AutoCompleteSelectEvent } from 'primeng/autocomplete';
import { InputTextModule } from 'primeng/inputtext';

import {
  ScButtonComponent,
  ScInputGroupComponent,
  ScMessageComponent,
  ScProgressSpinnerComponent,
  ScSelectComponent,
} from '../../../../../../ui-smartcontact/src/public-api';

interface Country {
  name: string;
  flag: string;
  prefixes: string[];
  /** País + prefijos: el filtro del select de país busca por nombre o por prefijo. */
  keywords: string;
}

interface Ticket {
  id: string;
  msisdn: string;
  channel: string;
  status: string;
  date: string;
}

const RAW: [string, string, string[]][] = [
  ['Afganistán', '🇦🇫', ['+93']], ['Albania', '🇦🇱', ['+355']], ['Alemania', '🇩🇪', ['+49']],
  ['Andorra', '🇦🇩', ['+376']], ['Angola', '🇦🇴', ['+244']],
  ['Canadá', '🇨🇦', ['+1428', '+1431', '+1437', '+1438', '+1450', '+1460', '+1807', '+1873', '+1879', '+1902', '+1905', '+1942']],
  ['Colombia', '🇨🇴', ['+57']], ['Congo', '🇨🇬', ['+242']], ['Ecuador', '🇪🇨', ['+593']], ['Egipto', '🇪🇬', ['+20']],
  ['Emiratos Árabes Unidos', '🇦🇪', ['+971']], ['Eslovaquia', '🇸🇰', ['+421']], ['España', '🇪🇸', ['+34']],
  ['Francia', '🇫🇷', ['+33']], ['Italia', '🇮🇹', ['+39']], ['México', '🇲🇽', ['+52']], ['Portugal', '🇵🇹', ['+351']],
  ['Reino Unido', '🇬🇧', ['+44']], ['República Dominicana', '🇩🇴', ['+1809', '+1829', '+1849']], ['Rumanía', '🇷🇴', ['+40']],
];

const COUNTRIES: Country[] = RAW.map(([name, flag, prefixes]) => ({
  name,
  flag,
  prefixes,
  keywords: `${name} ${prefixes.join(' ')}`,
}));

const BY_PREFIX = new Map<string, Country>();
for (const c of COUNTRIES) for (const p of c.prefixes) BY_PREFIX.set(p, c);
const ALL_PREFIXES = [...BY_PREFIX.keys()];

const TICKETS: Ticket[] = [
  ['#2051148', '+34612345678', 'Email', 'Abierto', '11-08-2026 16:46'],
  ['#2051201', '+4915112345678', 'SMS', 'Abierto', '11-08-2026 17:20'],
  ['#2051102', '+18735550142', 'SMS', 'Abierto', '11-08-2026 15:12'],
  ['#2051077', '+18795550188', 'Voz', 'Pendiente', '11-08-2026 14:03'],
  ['#2050981', '+18095550199', 'SMS', 'Abierto', '10-08-2026 18:20'],
  ['#2050934', '+18295550123', 'Chat', 'Resuelto', '10-08-2026 12:44'],
  ['#2050902', '+18495550166', 'SMS', 'Abierto', '10-08-2026 09:31'],
  ['#2050871', '+14385550177', 'Voz', 'Pendiente', '09-08-2026 17:55'],
  ['#2050840', '+14285550111', 'SMS', 'Resuelto', '09-08-2026 11:08'],
  ['#2050755', '+4407911123456', 'SMS', 'Abierto', '08-08-2026 19:12'],
  ['#2050702', '+33612345678', 'Chat', 'Pendiente', '08-08-2026 16:30'],
  ['#2050655', '+351912345678', 'Voz', 'Abierto', '07-08-2026 13:40'],
  ['#2050500', '+573001234567', 'SMS', 'Abierto', '05-08-2026 10:02'],
].map(([id, msisdn, channel, status, date]) => ({ id, msisdn, channel, status, date }));

const digits = (s: string): string => s.replace(/\D/g, '');

/** «34» → «+34»; admite hasta 5 dígitos. */
const normPrefix = (s: string): string => {
  const d = digits(s).slice(0, 5);
  return d ? `+${d}` : s.startsWith('+') ? '+' : '';
};

type Status = 'idle' | 'loading' | 'results' | 'empty';

/**
 * Búsqueda de tickets con país + prefijo, montada solo con componentes del DS / PrimeNG:
 * `sc-select` (p-select) para país y tipo, `p-autocomplete` para el prefijo editable,
 * `sc-inputgroup` + `sc-button` para el buscador.
 *
 * Reglas: el prefijo es un campo fijo y editable. Escribirlo actualiza el país; elegir un país
 * con un solo prefijo lo rellena, y con varios abre la lista de sus prefijos.
 */
@Component({
  selector: 'app-prefix-search-demo',
  imports: [
    FormsModule,
    PrimeTemplate,
    AutoComplete,
    InputTextModule,
    ScSelectComponent,
    ScInputGroupComponent,
    ScButtonComponent,
    ScMessageComponent,
    ScProgressSpinnerComponent,
  ],
  templateUrl: './prefix-search-demo.component.html',
  styleUrl: './prefix-search-demo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Los estilos deben llegar al interior de p-autocomplete (el ancho del input).
  encapsulation: ViewEncapsulation.None,
})
export class PrefixSearchDemoComponent {
  protected readonly countries = COUNTRIES;
  protected readonly types = [
    { label: 'Msisdn', value: 'msisdn' },
    { label: 'Nº de ticket', value: 'ticket' },
  ];

  protected readonly country = signal<Country | null>(null);
  protected readonly prefix = signal('');
  protected readonly type = signal<'msisdn' | 'ticket'>('msisdn');
  protected readonly number = signal('');
  protected readonly suggestions = signal<string[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly status = signal<Status>('idle');
  protected readonly results = signal<Ticket[]>([]);
  protected readonly why = signal('');
  protected readonly msisdnMode = computed(() => this.type() === 'msisdn');

  private readonly prefixAc = viewChild<AutoComplete>('prefixAc');
  private readonly queryInput = viewChild<ElementRef<HTMLInputElement>>('queryInput');
  private timer: ReturnType<typeof setTimeout> | undefined;

  protected countryOf(prefix: string): Country | undefined {
    return BY_PREFIX.get(prefix);
  }

  /** País de un número completo: gana el prefijo más largo que coincida. */
  protected countryOfNumber(msisdn: string): Country | undefined {
    const hit = ALL_PREFIXES.filter((p) => msisdn.startsWith(p)).sort((a, b) => b.length - a.length)[0];
    return hit ? BY_PREFIX.get(hit) : undefined;
  }

  protected prefixCount(c: Country): string {
    return c.prefixes.length > 1 ? `${c.prefixes.length} prefijos` : c.prefixes[0];
  }

  // ─── País ──────────────────────────────────────────────────────────────
  protected onCountry(c: unknown): void {
    const country = c as Country | null;
    this.country.set(country);
    this.error.set(null);
    if (!country) return;
    this.prefix.set(country.prefixes.length === 1 ? country.prefixes[0] : '');
    // El panel del select devuelve el foco a su botón al cerrarse; esperamos a que termine.
    setTimeout(() => {
      if (country.prefixes.length > 1) this.prefixAc()?.inputEL?.nativeElement.focus(); // completeOnFocus abre la lista
      else this.queryInput()?.nativeElement.focus();
    }, 120);
  }

  // ─── Prefijo editable ──────────────────────────────────────────────────
  protected searchPrefix(e: AutoCompleteCompleteEvent): void {
    const dg = digits(e.query);
    const c = this.country();
    let list: string[];
    if (c && c.prefixes.length > 1 && (!dg || e.query === this.prefix())) list = c.prefixes;
    else if (!dg) list = [];
    else list = ALL_PREFIXES.filter((p) => digits(p).startsWith(dg));
    this.suggestions.set(list);
  }

  protected onPrefixModel(v: unknown): void {
    if (typeof v !== 'string') return;
    const norm = normPrefix(v);
    this.prefix.set(norm);
    this.error.set(null);
    this.country.set(BY_PREFIX.get(norm) ?? null);
  }

  protected onPrefixSelect(e: AutoCompleteSelectEvent): void {
    const p = String(e.value);
    this.prefix.set(p);
    this.country.set(BY_PREFIX.get(p) ?? null);
    // p-autocomplete devuelve el foco a su input tras seleccionar; esperamos a que termine.
    setTimeout(() => this.queryInput()?.nativeElement.focus(), 60);
  }

  protected onPrefixBlur(): void {
    const p = this.prefix();
    if (p.length > 1 && !this.country()) this.error.set(`El prefijo ${p} no existe. Elige uno de la lista.`);
  }

  // ─── Búsqueda ──────────────────────────────────────────────────────────
  protected onType(v: unknown): void {
    this.type.set(v === 'ticket' ? 'ticket' : 'msisdn');
    this.error.set(null);
  }

  protected search(): void {
    const ms = this.msisdnMode();
    const c = this.country();
    if (ms && (!c || (c.prefixes.length > 1 && !this.prefix()))) {
      const typed = this.prefix().length > 1;
      this.error.set(
        !c && typed
          ? `El prefijo ${this.prefix()} no existe. Elige uno de la lista.`
          : !c
            ? 'Selecciona un país o escribe un prefijo para buscar por Msisdn.'
            : `Selecciona uno de los ${c.prefixes.length} prefijos de ${c.name}.`,
      );
      return;
    }
    this.error.set(null);
    this.status.set('loading');
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      const val = digits(this.number());
      const prefix = this.prefix();
      const list = TICKETS.filter((t) => {
        if (!ms) return !val || digits(t.id).includes(val);
        if (!t.msisdn.startsWith(prefix)) return false;
        return !val || t.msisdn.slice(prefix.length).includes(val);
      });
      this.results.set(list);
      this.why.set(
        ms ? `Sin resultados para: ${c?.name} · MSISDN · ${prefix}${val ? ' ' + val : ''}` : `Sin resultados para: Nº de ticket · ${val}`,
      );
      this.status.set(list.length ? 'results' : 'empty');
    }, 700);
  }

  protected clear(): void {
    this.country.set(null);
    this.prefix.set('');
    this.number.set('');
    this.error.set(null);
    this.status.set('idle');
  }
}
