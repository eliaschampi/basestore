<script lang="ts">
	import type { StatusIndicatorProps, StatusIndicatorStatus } from "./types";

	const {
		status = "default",
		animated = false,
		pulse = false,
		tooltip = "",
		class: className = ""
	}: StatusIndicatorProps = $props();

	// pulse is an alias for animated
	const isAnimated = $derived(animated || pulse);

	const predefinedStatuses: StatusIndicatorStatus[] = [
		"default",
		"active",
		"inactive",
		"pending",
		"error",
		"primary",
		"secondary",
		"success",
		"warning",
		"danger",
		"info"
	];

	const isPredefined = $derived(() => {
		return predefinedStatuses.includes(status as StatusIndicatorStatus);
	});

	const classes = $derived(() => {
		return [
			"lumi-status-indicator",
			isPredefined() && `lumi-status-indicator--${status}`,
			!isPredefined() && "lumi-status-indicator--custom",
			isAnimated && "lumi-status-indicator--animated",
			className
		]
			.filter(Boolean)
			.join(" ");
	});

	const customStyle = $derived(() => {
		if (!isPredefined()) {
			return `--lumi-status-indicator-custom-color: ${status}`;
		}
		return "";
	});
</script>

<div class="lumi-status-container" title={tooltip}>
	<span class={classes()} style={customStyle()}></span>
</div>

<style>
	.lumi-status-container {
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.lumi-status-indicator {
		display: inline-block;
		width: 8px;
		height: 8px;
		border-radius: var(--lumi-radius-full);
		transition: var(--lumi-transition-all);
	}

	/* Predefined statuses */
	.lumi-status-indicator--default {
		background: var(--lumi-color-gray-400);
	}

	.lumi-status-indicator--active {
		background: var(--lumi-color-success);
	}

	.lumi-status-indicator--inactive {
		background: var(--lumi-color-gray-400);
	}

	.lumi-status-indicator--pending {
		background: var(--lumi-color-warning);
	}

	.lumi-status-indicator--error {
		background: var(--lumi-color-danger);
	}

	.lumi-status-indicator--primary {
		background: var(--lumi-color-primary);
	}

	.lumi-status-indicator--secondary {
		background: var(--lumi-color-secondary);
	}

	.lumi-status-indicator--success {
		background: var(--lumi-color-success);
	}

	.lumi-status-indicator--warning {
		background: var(--lumi-color-warning);
	}

	.lumi-status-indicator--danger {
		background: var(--lumi-color-danger);
	}

	.lumi-status-indicator--info {
		background: var(--lumi-color-info);
	}

	/* Custom color */
	.lumi-status-indicator--custom {
		background: var(--lumi-status-indicator-custom-color);
	}

	/* Animated pulse */
	.lumi-status-indicator--animated {
		animation: lumi-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}

	@keyframes lumi-pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}

	/* Reduced motion support */
	@media (prefers-reduced-motion: reduce) {
		.lumi-status-indicator--animated {
			animation: none;
		}
	}
</style>
