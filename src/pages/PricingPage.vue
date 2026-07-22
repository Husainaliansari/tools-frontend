<script setup lang="ts">
  /** PricingPage — plan comparison cards. */
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  import BaseIcon from '@components/icons/BaseIcon.vue'
  import BaseButton from '@components/ui/BaseButton.vue'
  import SegmentedControl from '@components/ui/SegmentedControl.vue'
  import FaqItem from '@components/ui/FaqItem.vue'
  import { GENERAL_FAQS, PRICING_PLANS, ROUTE_NAMES } from '@constants'
  import { useFeedback, usePageMeta } from '@composables'

  usePageMeta({
    title: 'Pricing — PDFly',
    description:
      'Simple, transparent PDFly pricing. Start free with generous limits, or upgrade to Pro for larger files, unlimited tasks and batch processing. Enterprise plans available.',
  })

  const router = useRouter()
  const { showToast } = useFeedback()

  const currency = ref<'USD ($)' | 'INR (₹)'>('USD ($)')

  function getPrice(planName: string, defaultPrice: string) {
    if (planName === 'Free') {
      return currency.value === 'USD ($)' ? '$0' : '₹0'
    }
    if (planName === 'Pro') {
      return currency.value === 'USD ($)' ? '$9' : '₹749'
    }
    return defaultPrice
  }

  function choose(plan: (typeof PRICING_PLANS)[number]) {
    if (plan.name === 'Free') router.push({ name: ROUTE_NAMES.REGISTER })
    else if (plan.name === 'Enterprise') router.push({ name: ROUTE_NAMES.CONTACT })
    else showToast('Redirecting to checkout…', 'info')
  }
</script>

<template>
  <div>
    <section class="pf-price-hero">
      <div class="pf-container pf-price-hero__inner">
        <h1 class="pf-price-hero__title">Simple, transparent pricing</h1>
        <p class="pf-price-hero__lede">
          Start free and upgrade when you need more. No hidden fees, cancel anytime.
        </p>
        <div class="pf-price-toggle-container">
          <SegmentedControl
            v-model="currency"
            :options="['USD ($)', 'INR (₹)']"
          />
        </div>
      </div>
    </section>

    <section class="pf-container pf-price-body">
      <div class="pf-price-grid">
        <div
          v-for="plan in PRICING_PLANS"
          :key="plan.name"
          class="pf-plan"
          :class="{ 'pf-plan--featured': plan.featured }"
        >
          <div v-if="plan.featured" class="pf-plan__ribbon">Most popular</div>
          <div class="pf-plan__name">{{ plan.name }}</div>
          <div class="pf-plan__price">
            <span class="pf-plan__amount">{{ getPrice(plan.name, plan.price) }}</span>
            <span class="pf-plan__cadence">{{ plan.cadence }}</span>
          </div>
          <p class="pf-plan__desc">{{ plan.description }}</p>
          <BaseButton full :variant="plan.featured ? 'primary' : 'secondary'" @click="choose(plan)">
            {{ plan.cta }}
          </BaseButton>
          <ul class="pf-plan__features">
            <li v-for="feature in plan.features" :key="feature">
              <span class="pf-plan__check"><BaseIcon name="check" :size="15" /></span>
              {{ feature }}
            </li>
          </ul>
        </div>
      </div>
    </section>

    <section class="pf-container pf-price-faq">
      <h2 class="pf-price-faq__title">Pricing questions</h2>
      <div class="pf-price-faq__list">
        <FaqItem
          v-for="faq in GENERAL_FAQS"
          :key="faq.question"
          :question="faq.question"
          :answer="faq.answer"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
  .pf-price-hero {
    background: var(--hero-bg);
    border-bottom: 1px solid hsl(var(--color-border));
    padding: 52px 0 44px;
  }
  .pf-price-hero__inner {
    text-align: center;
  }
  .pf-price-hero__title {
    font-size: clamp(30px, 5vw, 46px);
    font-weight: 800;
    letter-spacing: -0.03em;
    color: hsl(var(--color-text));
    margin: 0 0 14px;
  }
  .pf-price-hero__lede {
    font-size: 17px;
    color: hsl(var(--color-text-muted));
    max-width: 520px;
    margin: 0 auto;
  }
  .pf-price-toggle-container {
    display: flex;
    justify-content: center;
    margin-top: 24px;
  }
  .pf-price-toggle-container :deep(.pf-seg) {
    max-width: 250px;
    width: 100%;
  }
  .pf-price-body {
    padding-top: 44px;
  }
  .pf-price-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 22px;
  }
  .pf-plan {
    position: relative;
    background: hsl(var(--color-surface));
    border: 1px solid hsl(var(--color-border));
    border-radius: var(--radius-2xl);
    padding: 28px;
    box-shadow: var(--shadow-sm);
    display: flex;
    flex-direction: column;
    height: 100%;
  }
  .pf-plan--featured {
    border-color: hsl(var(--color-primary));
    box-shadow: var(--shadow-lg);
  }
  .pf-plan__ribbon {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(180deg, hsl(var(--color-primary)), hsl(var(--color-navy)));
    color: #fff;
    font-size: 12px;
    font-weight: 700;
    padding: 5px 14px;
    border-radius: var(--radius-full);
  }
  .pf-plan__name {
    font-weight: 800;
    font-size: 18px;
    color: hsl(var(--color-text));
  }
  .pf-plan__price {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin: 12px 0;
  }
  .pf-plan__amount {
    font-size: 40px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: hsl(var(--color-text));
  }
  .pf-plan__cadence {
    font-size: 14px;
    color: hsl(var(--color-text-faint));
    font-weight: 600;
  }
  .pf-plan__desc {
    font-size: 14px;
    color: hsl(var(--color-text-muted));
    line-height: 1.5;
    margin: 0 0 20px;
    min-height: 42px;
  }
  .pf-plan__features {
    list-style: none;
    padding: 0;
    margin: 22px 0 0;
    display: grid;
    gap: 12px;
    flex-grow: 1;
  }
  .pf-plan__features li {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    color: hsl(var(--color-text-muted));
  }
  .pf-plan__check {
    width: 22px;
    height: 22px;
    flex: none;
    border-radius: var(--radius-full);
    background: hsl(var(--color-success) / 0.14);
    color: hsl(var(--color-success));
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .pf-price-faq {
    padding-top: 70px;
    width: 90%;
    max-width: 90%;
    margin: 0 auto;
  }
  .pf-price-faq__title {
    font-size: 22px;
    font-weight: 800;
    color: hsl(var(--color-text));
    margin: 0 0 18px;
    text-align: center;
  }
  .pf-price-faq__list {
    display: grid;
    gap: 12px;
  }
</style>
