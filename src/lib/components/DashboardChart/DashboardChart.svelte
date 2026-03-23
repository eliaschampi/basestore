<script lang="ts">
	import { curveMonotoneX } from 'd3-shape';
	import { LineChart } from 'layerchart';
	import type { DashboardColor } from '$lib/types/dashboard';
	import type { DashboardChartProps } from './types';

	const {
		data,
		color = 'primary',
		height = 240,
		valueFormat = 'number',
		emptyMessage = 'No hay datos suficientes para mostrar este gráfico.',
		'aria-label': ariaLabel = 'Gráfico del dashboard',
		class: className = ''
	}: DashboardChartProps = $props();

	const chartColorByVariant: Record<DashboardColor, string> = {
		primary: 'var(--lumi-color-primary)',
		secondary: 'var(--lumi-color-secondary)',
		success: 'var(--lumi-color-success)',
		warning: 'var(--lumi-color-warning)',
		danger: 'var(--lumi-color-danger)',
		info: 'var(--lumi-color-info)'
	};

	const chartColor = $derived(chartColorByVariant[color]);
	const chartStyle = $derived(`height: ${height}px;`);
	const hasValues = $derived(data.some((point) => point.value > 0));
	const classes = $derived(['lumi-dashboard-chart', className].filter(Boolean).join(' '));

	// LayerChart's LineChart needs Date x-values (triggers scaleTime).
	// String labels produce NaN coordinates with the default scaleLinear.
	const chartData = $derived(data.map((p) => ({ ...p, date: new Date(`${p.key}T12:00:00Z`) })));

	const xAxisFormatter = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short' });

	function formatAxisValue(value: number): string {
		if (valueFormat === 'currency') {
			return new Intl.NumberFormat('es-PE', {
				style: 'currency',
				currency: 'PEN',
				maximumFractionDigits: 0
			}).format(value);
		}

		return new Intl.NumberFormat('es-PE', {
			maximumFractionDigits: 0,
			notation: value >= 1000 ? 'compact' : 'standard'
		}).format(value);
	}

	const axisLabelStyle = 'fill: var(--lumi-color-text-muted); font-size: 11px;';
</script>

{#if !hasValues}
	<div class={classes} style={chartStyle} aria-label={ariaLabel}>
		<div class="lumi-dashboard-chart__empty">
			<p class="lumi-margin--none lumi-text--sm lumi-text--muted">{emptyMessage}</p>
		</div>
	</div>
{:else}
	<div class={classes} style={chartStyle} aria-label={ariaLabel}>
		<LineChart
			data={chartData}
			x="date"
			y="value"
			series={[{ key: 'value', value: 'value', color: chartColor }]}
			legend={false}
			rule={false}
			tooltip={false}
			points={false}
			props={{
				grid: { class: 'lumi-dashboard-chart__grid' },
				xAxis: {
					tickLength: 0,
					tickLabelProps: { style: axisLabelStyle },
					format: (d: Date) => xAxisFormatter.format(d),
					classes: {
						tick: 'lumi-dashboard-chart__tick',
						rule: 'lumi-dashboard-chart__axis-rule'
					}
				},
				yAxis: {
					tickLength: 0,
					tickLabelProps: { style: axisLabelStyle },
					format: formatAxisValue,
					classes: {
						tick: 'lumi-dashboard-chart__tick',
						rule: 'lumi-dashboard-chart__axis-rule'
					}
				},
				spline: {
					curve: curveMonotoneX,
					strokeWidth: 2.5,
					draw: { duration: 600 },
					class: 'lumi-dashboard-chart__spline'
				},
				svg: {
					class: 'lumi-dashboard-chart__surface'
				}
			}}
		/>
	</div>
{/if}

<style>
	.lumi-dashboard-chart {
		min-height: 220px;
	}

	.lumi-dashboard-chart__empty {
		height: 100%;
		min-height: inherit;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--lumi-space-lg);
		border: var(--lumi-border-width-thin) dashed var(--lumi-color-border-light);
		border-radius: var(--lumi-radius-xl);
		background: color-mix(in srgb, var(--lumi-color-surface) 94%, transparent);
	}

	.lumi-dashboard-chart :global(.lumi-dashboard-chart__surface) {
		height: 100%;
		min-height: inherit;
	}

	.lumi-dashboard-chart :global(.lumi-dashboard-chart__surface svg) {
		overflow: visible;
	}

	.lumi-dashboard-chart :global(.lumi-dashboard-chart__grid) {
		stroke: color-mix(in srgb, var(--lumi-color-text-muted) 8%, transparent);
	}

	.lumi-dashboard-chart :global(.lumi-dashboard-chart__axis-rule),
	.lumi-dashboard-chart :global(.lumi-dashboard-chart__tick) {
		stroke: color-mix(in srgb, var(--lumi-color-text-muted) 16%, transparent);
	}

	.lumi-dashboard-chart :global(.lumi-dashboard-chart__spline) {
		stroke-linecap: round;
		stroke-linejoin: round;
		filter: drop-shadow(0 4px 12px color-mix(in srgb, var(--lumi-color-primary) 14%, transparent));
	}
</style>
