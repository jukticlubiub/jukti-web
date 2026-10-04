/**
 * Juro's opening shot: at the top of the homepage a big Juro peeks up from the bottom
 * edge. Scrolling this share of the screen height takes him down onto his path through
 * the page, while the hero is pinned (held still), so he leaves before the title moves.
 * Shared by the hero's pin (Hero.tsx) and Juro's placement (Juro.tsx).
 */
export const PEEK_SCROLL = 0.45;

export const peekDistance = () => window.innerHeight * PEEK_SCROLL;
