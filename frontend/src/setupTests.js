// Test setup file for Vitest
import '@testing-library/jest-dom';

// Mock scrollIntoView since it's not implemented in jsdom
window.HTMLElement.prototype.scrollIntoView = function() {};
