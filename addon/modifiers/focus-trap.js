import { setModifierManager, capabilities } from '@ember/modifier';
import { createFocusTrap as CreateFocusTrap } from 'focus-trap';
import { dependencySatisfies, macroCondition } from '@embroider/macros';

export default setModifierManager(
  () => ({
    capabilities: capabilities(
      macroCondition(dependencySatisfies('ember-source', '>=3.22.0'))
        ? '3.22'
        : '3.13'
    ),

    createModifier() {
      return {
        focusTrapOptions: undefined,
        isActive: true,
        isPaused: false,
        shouldSelfFocus: false,
        focusTrap: undefined,
        previouslyFocusedElement: undefined,
      };
    },

    installModifier(
      state,
      element,
      {
        named: {
          isActive,
          isPaused,
          shouldSelfFocus,
          focusTrapOptions,
          _createFocusTrap,
        },
      }
    ) {
      // treat the original focusTrapOptions as immutable, so do a shallow copy here
      state.focusTrapOptions = { ...focusTrapOptions } || {};
      if (typeof isActive !== 'undefined') {
        state.isActive = isActive;
      }

      if (typeof isPaused !== 'undefined') {
        state.isPaused = isPaused;
      }
      if (
        state.focusTrapOptions &&
        typeof state.focusTrapOptions.initialFocus === 'undefined' &&
        shouldSelfFocus
      ) {
        state.focusTrapOptions.initialFocus = element;
      }

      // Private to allow mocking FocusTrap in tests
      let createFocusTrap = CreateFocusTrap;
      if (_createFocusTrap) {
        createFocusTrap = _createFocusTrap;
      }

      if (state.focusTrapOptions.returnFocusOnDeactivate !== false) {
        state.focusTrapOptions.returnFocusOnDeactivate = true;
      }

      if (typeof document !== 'undefined') {
        state.previouslyFocusedElement = document.activeElement;
      }

      state.focusTrap = createFocusTrap(element, state.focusTrapOptions);

      if (state.isActive) {
        state.focusTrap.activate();
      }

      if (state.isPaused) {
        state.focusTrap.pause();
      }
    },

    updateModifier(state, { named: params }) {
      const focusTrapOptions = params.focusTrapOptions || {};

      if (state.isActive && !params.isActive) {
        const { returnFocusOnDeactivate } = focusTrapOptions;
        const returnFocus =
          typeof returnFocusOnDeactivate === 'undefined' ? true : false;
        state.focusTrap.deactivate({ returnFocus });
      } else if (!state.isActive && params.isActive) {
        state.focusTrap.activate();
      }

      if (state.isPaused && !params.isPaused) {
        state.focusTrap.unpause();
      } else if (!state.isPaused && params.isPaused) {
        state.focusTrap.pause();
      }

      // Update state
      state.focusTrapOptions = focusTrapOptions;

      if (typeof params.isActive !== 'undefined') {
        state.isActive = params.isActive;
      }

      if (typeof params.isPaused !== 'undefined') {
        state.isPaused = params.isPaused;
      }
    },

    destroyModifier({ focusTrap, focusTrapOptions, previouslyFocusedElement }) {
      // FastBoot guard https://github.com/emberjs/ember.js/issues/17949
      if (typeof FastBoot !== 'undefined') {
        return;
      }
      focusTrap.deactivate();
      if (
        focusTrapOptions.returnFocusOnDeactivate !== false &&
        previouslyFocusedElement &&
        previouslyFocusedElement.focus
      ) {
        previouslyFocusedElement.focus();
      }
    },
  }),
  class FocusTrapModifier {}
);
