<template>
  <div class="onboarding">
    <div class="onboarding-icon">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="8" stroke="currentColor" stroke-width="2" opacity="0.6"/>
        <circle cx="10" cy="12" r="4" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
        <circle cx="38" cy="12" r="4" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
        <circle cx="10" cy="36" r="4" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
        <circle cx="38" cy="36" r="4" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
        <line x1="18" y1="19" x2="13" y2="15" stroke="currentColor" stroke-width="1.2" opacity="0.3"/>
        <line x1="30" y1="19" x2="35" y2="15" stroke="currentColor" stroke-width="1.2" opacity="0.3"/>
        <line x1="18" y1="29" x2="13" y2="33" stroke="currentColor" stroke-width="1.2" opacity="0.3"/>
        <line x1="30" y1="29" x2="35" y2="33" stroke="currentColor" stroke-width="1.2" opacity="0.3"/>
      </svg>
    </div>
    <h3 class="onboarding-title">Исследуйте аттракторы</h3>
    <p class="onboarding-text">
      Аттракторы — это жизненные домены, к которым тяготеют ценности человека:
      семья, работа, саморазвитие и другие.
    </p>
    <div class="onboarding-steps">
      <div class="onboarding-step">
        <span class="step-number">1</span>
        <span class="step-text">Кликните на аттрактор на графе</span>
      </div>
      <div class="onboarding-step">
        <span class="step-number">2</span>
        <span class="step-text">Увидите связанные жизненные ситуации</span>
      </div>
      <div class="onboarding-step">
        <span class="step-number">3</span>
        <span class="step-text">Откройте предиктивный анализ стратегий</span>
      </div>
    </div>
    <p class="onboarding-hint">
      Или нажмите <strong>Ситуации</strong> в шапке, чтобы начать
      с конкретной жизненной ситуации
    </p>
  </div>
</template>

<style scoped>
.onboarding {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 32px 24px;
  text-align: center;
}
.onboarding-icon {
  color: var(--accent);
  opacity: 0.5;
  margin-bottom: 16px;
}
.onboarding-title {
  font-family: var(--font-display);
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--text);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
}
.onboarding-text {
  font-size: var(--fs-sm);
  color: var(--text-muted);
  line-height: 1.6;
  max-width: 280px;
  margin-bottom: 20px;
}
.onboarding-steps {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-start;
  border-left: 2px solid var(--accent);
  padding-left: 16px;
  margin-bottom: 20px;
}
.onboarding-step {
  display: flex;
  align-items: center;
  gap: 10px;
}
.step-number {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.step-text {
  font-size: var(--fs-sm);
  color: var(--text);
  line-height: 1.4;
  text-align: left;
}
.onboarding-hint {
  font-size: var(--fs-xs);
  color: var(--text-dim);
  border-top: 1px solid var(--border);
  padding-top: 16px;
  max-width: 260px;
  line-height: 1.5;
}
.onboarding-hint strong {
  color: var(--accent);
}
</style>
