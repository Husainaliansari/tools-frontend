<script setup lang="ts">
  /**
   * ProfilePage — cover header, personal information and quick preferences.
   */
  import { ref } from 'vue'
  import BaseCard from '@components/ui/BaseCard.vue'
  import BaseInput from '@components/ui/BaseInput.vue'
  import BaseButton from '@components/ui/BaseButton.vue'
  import BaseBadge from '@components/ui/BaseBadge.vue'
  import BaseToggle from '@components/ui/BaseToggle.vue'
  import BaseSelect from '@components/ui/BaseSelect.vue'
  import SegmentedControl from '@components/ui/SegmentedControl.vue'
  import PreferenceRow from '@components/app/PreferenceRow.vue'
  import { DEMO_USER } from '@constants'
  import { useTheme, useFeedback } from '@composables'

  const { isDark, setTheme } = useTheme()
  const { showToast } = useFeedback()

  const personalInfo = [
    { label: 'Full name', value: DEMO_USER.name },
    { label: 'Email address', value: DEMO_USER.email },
    { label: 'Phone', value: DEMO_USER.phone },
    { label: 'Company', value: DEMO_USER.company },
    { label: 'Role', value: DEMO_USER.role },
    { label: 'Location', value: DEMO_USER.location },
  ]

  const language = ref('English (US)')
  const emailNotifs = ref(true)
  const themeChoice = ref(isDark.value ? 'Dark' : 'Light')

  function onThemeChange(value: string) {
    themeChoice.value = value
    setTheme(value === 'Dark' ? 'dark' : 'light')
  }
</script>

<template>
  <div class="pf-profile animate-fade-up">
    <!-- Header -->
    <BaseCard>
      <div class="pf-profile__header">
        <div class="pf-profile__cover" />
        <div class="pf-profile__body">
          <div class="pf-profile__row">
            <div class="pf-profile__avatar">{{ DEMO_USER.initials }}</div>
            <div class="pf-profile__identity">
              <div class="pf-profile__name-row">
                <span class="pf-profile__name">{{ DEMO_USER.name }}</span>
                <BaseBadge tone="purple">{{ DEMO_USER.plan }}</BaseBadge>
              </div>
              <div class="pf-profile__email">{{ DEMO_USER.email }}</div>
            </div>
            <div class="pf-profile__edit">
              <BaseButton variant="secondary" icon="edit" @click="showToast('Edit mode')">
                Edit profile
              </BaseButton>
            </div>
          </div>
        </div>
      </div>
    </BaseCard>

    <!-- Personal information -->
    <BaseCard>
      <div class="pf-profile__section">
        <div class="pf-profile__section-title">Personal information</div>
        <div class="pf-profile__grid">
          <div v-for="field in personalInfo" :key="field.label">
            <label class="pf-profile__label">{{ field.label }}</label>
            <BaseInput :model-value="field.value" />
          </div>
        </div>
      </div>
    </BaseCard>

    <!-- Preferences -->
    <BaseCard>
      <div class="pf-profile__section">
        <div class="pf-profile__section-title">Preferences</div>
        <PreferenceRow icon="globe" title="Language" subtitle="Choose your interface language">
          <BaseSelect
            v-model="language"
            size="mini"
            :options="['English (US)', 'Español', 'Français', 'Deutsch', '日本語']"
          />
        </PreferenceRow>
        <PreferenceRow icon="sun" title="Theme" subtitle="Switch between light and dark mode">
          <SegmentedControl
            :model-value="themeChoice"
            :options="[
              { value: 'Light', icon: 'sun' },
              { value: 'Dark', icon: 'moon' },
            ]"
            @update:model-value="onThemeChange"
          />
        </PreferenceRow>
        <PreferenceRow
          icon="bell"
          title="Email notifications"
          subtitle="Get notified when jobs finish"
          last
        >
          <BaseToggle v-model="emailNotifs" label="Email notifications" />
        </PreferenceRow>
      </div>
    </BaseCard>
  </div>
</template>

<style scoped>
  .pf-profile {
    display: grid;
    gap: 20px;
    max-width: 820px;
  }
  .pf-profile__header {
    overflow: hidden;
  }
  .pf-profile__cover {
    height: 120px;
    background: linear-gradient(120deg, hsl(var(--color-navy)), hsl(var(--color-indigo)));
  }
  .pf-profile__body {
    padding: 0 26px 24px;
    margin-top: -42px;
  }
  .pf-profile__row {
    display: flex;
    align-items: flex-end;
    gap: 18px;
    flex-wrap: wrap;
  }
  .pf-profile__avatar {
    width: 88px;
    height: 88px;
    border-radius: var(--radius-2xl);
    background: linear-gradient(135deg, hsl(var(--color-indigo)), hsl(var(--color-navy)));
    border: 4px solid hsl(var(--color-surface));
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 32px;
    flex: none;
  }
  .pf-profile__identity {
    flex: 1;
    min-width: 0;
    padding-bottom: 6px;
  }
  .pf-profile__name-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .pf-profile__name {
    font-weight: 800;
    font-size: 22px;
    color: hsl(var(--color-text));
  }
  .pf-profile__email {
    font-size: 14px;
    color: hsl(var(--color-text-muted));
  }
  .pf-profile__edit {
    padding-bottom: 6px;
  }
  .pf-profile__section {
    padding: 26px;
  }
  .pf-profile__section-title {
    font-weight: 700;
    font-size: 16px;
    color: hsl(var(--color-text));
    margin-bottom: 18px;
  }
  .pf-profile__grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  .pf-profile__label {
    font-size: 13px;
    font-weight: 600;
    color: hsl(var(--color-text-muted));
    display: block;
    margin-bottom: 7px;
  }
  @media (max-width: 899px) {
    .pf-profile__grid {
      grid-template-columns: 1fr;
    }
  }
</style>
