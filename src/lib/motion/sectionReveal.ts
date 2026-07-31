import { animate, onScroll, stagger, type Scope } from "animejs";
import { motion } from "@/lib/motion/tokens";

type RevealOptions = {
  selector: string;
  childSelector?: string;
  once?: boolean;
};

/** Register a scroll-triggered section reveal within an Anime.js scope. */
export function registerSectionReveal(scope: Scope, { selector, childSelector, once = true }: RevealOptions) {
  if (scope.matches.reducedMotion) return;

  const root = scope.root as HTMLElement;
  const section = root.querySelector(selector);
  if (!section) return;

  const heading = section.querySelector("[data-reveal='heading']");
  const copy = section.querySelector("[data-reveal='copy']");
  const items = childSelector ? section.querySelectorAll(childSelector) : [];

  const runReveal = () => {
    if (heading) {
      animate(heading, {
        opacity: [0, 1],
        translateY: [motion.distance.reveal, 0],
        duration: motion.duration.reveal,
        ease: motion.easing.out,
      });
    }
    if (copy) {
      animate(copy, {
        opacity: [0, 1],
        translateY: [motion.distance.subtle, 0],
        duration: motion.duration.standard,
        delay: motion.stagger.standard,
        ease: motion.easing.out,
      });
    }
    if (items.length) {
      animate(items, {
        opacity: [0, 1],
        translateY: [motion.distance.subtle, 0],
        duration: motion.duration.standard,
        delay: stagger(motion.stagger.standard),
        ease: motion.easing.out,
      });
    }
  };

  const targets: Element[] = [];
  if (heading) targets.push(heading);
  if (copy) targets.push(copy);
  if (targets.length) {
    animate(targets, { opacity: 0, translateY: motion.distance.reveal });
  }
  if (items.length) {
    animate(items, { opacity: 0, translateY: motion.distance.subtle });
  }

  const observer = onScroll({
    target: section,
    enter: "bottom 88%",
    leave: "top 12%",
    repeat: !once,
    onEnter: () => runReveal(),
  });

  scope.register(observer);
}
