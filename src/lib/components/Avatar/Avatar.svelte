<script lang="ts">
	import { Icon } from "../Icon";
	import type { AvatarProps } from "./types";

	const {
		text = "",
		src = "",
		icon = "",
		alt = "",
		color = "primary",
		size = "md",
		class: className = "",
		onclick,
		onerror
	}: AvatarProps = $props();

	let imageError = $state(false);

	// Generate display text (initials) - matches Vue original logic
	const displayText = $derived(() => {
		if (!text) return "";

		const textStr = String(text);
		if (textStr.length <= 5) return textStr;

		// Create initials for long text
		const words = textStr.split(/\s+/);
		if (words.length > 1) {
			return words
				.map((word) => word[0]?.toUpperCase() || "")
				.join("")
				.slice(0, 5);
		}

		return textStr[0]?.toUpperCase() || "";
	});

	// Computed classes
	const classes = $derived(() => {
		return ["lumi-avatar", `lumi-avatar--${color}`, `lumi-avatar--${size}`, className]
			.filter(Boolean)
			.join(" ");
	});

	// Event handlers
	const handleImageError = (event: Event) => {
		imageError = true;
		if (onerror) onerror(event);
	};

	const handleClick = (event: MouseEvent) => {
		if (onclick) onclick(event);
	};
</script>

<div
	class={classes()}
	role="img"
	aria-label={alt || text || "Avatar"}
	onclick={handleClick}
	tabindex={onclick ? 0 : -1}
>
	{#if src && !imageError}
		<!-- Image has priority -->
		<img {src} {alt} class="lumi-avatar__image" onerror={handleImageError} />
	{:else if icon}
		<!-- Icon fallback -->
		<span class="lumi-avatar__icon">
			<Icon {icon} size="md" />
		</span>
	{:else if text || (src && imageError)}
		<!-- Text/Initials fallback -->
		<span class="lumi-avatar__text">
			{displayText()}
		</span>
	{/if}
</div>

<style>
	/* ============================================================================
	 * AVATAR COMPONENT - Clean and consistent design
	 * ============================================================================ */

	.lumi-avatar {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--lumi-radius-2xl);
		font-weight: var(--lumi-font-weight-medium);
		line-height: var(--lumi-line-height-normal);
		transition: all var(--lumi-transition-base);
		white-space: nowrap;
		cursor: pointer;
		user-select: none;
		border: none;
		overflow: hidden;
		flex-shrink: 0;
	}

	/* Size variants - matches original Vue */
	.lumi-avatar--sm {
		width: var(--lumi-space-lg);
		height: var(--lumi-space-lg);
		font-size: var(--lumi-font-size-sm);
	}

	.lumi-avatar--md {
		width: var(--lumi-space-xxl);
		height: var(--lumi-space-xxl);
		font-size: var(--lumi-font-size-base);
	}

	.lumi-avatar--lg {
		width: var(--lumi-space-3xl);
		height: var(--lumi-space-3xl);
		font-size: var(--lumi-font-size-lg);
	}

	.lumi-avatar--xl {
		width: var(--lumi-space-4xl);
		height: var(--lumi-space-4xl);
		font-size: var(--lumi-font-size-xl);
	}

	/* Color variants */
	.lumi-avatar--primary {
		background-color: var(--lumi-color-primary);
		color: var(--lumi-color-white);
	}

	.lumi-avatar--secondary {
		background-color: var(--lumi-color-secondary);
		color: var(--lumi-color-white);
	}

	.lumi-avatar--success {
		background-color: var(--lumi-color-success);
		color: var(--lumi-color-white);
	}

	.lumi-avatar--warning {
		background-color: var(--lumi-color-warning);
		color: var(--lumi-color-white);
	}

	.lumi-avatar--danger {
		background-color: var(--lumi-color-danger);
		color: var(--lumi-color-white);
	}

	.lumi-avatar--info {
		background-color: var(--lumi-color-info);
		color: var(--lumi-color-white);
	}

	/* Text styling */
	.lumi-avatar__text {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
		font-weight: var(--lumi-font-weight-semibold);
	}

	/* Icon styling */
	.lumi-avatar__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		color: currentColor;
	}

	.lumi-avatar__icon :global(svg) {
		width: 60%;
		height: 60%;
	}

	/* Image styling */
	.lumi-avatar__image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: var(--lumi-radius-2xl);
	}

	/* Hover effects */
	.lumi-avatar:hover {
		transform: translateY(-1px);
		box-shadow: var(--lumi-shadow-md);
	}

	/* Focus styles */
	.lumi-avatar:focus-visible {
		outline: 2px solid currentColor;
		outline-offset: 2px;
	}

	/* Accessibility */
	@media (prefers-reduced-motion: reduce) {
		.lumi-avatar {
			transition: none;
		}

		.lumi-avatar:hover {
			transform: none;
		}
	}
</style>
