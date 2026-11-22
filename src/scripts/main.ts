import { initFit } from './fit';
import { initMenu } from './menu';
import { initProblems } from './problems';
import { initForm } from './form';
import { initMotion } from './motion';
import { initAccordions } from './accordion';
import { initDelivPreview } from './preview';
import { initCursorDot } from './cursorDot';
import { initSmoothScroll } from './smooth';

document.documentElement.classList.add('js');

initSmoothScroll();
initFit();
initMenu();
initProblems();
initForm();
initAccordions();
initDelivPreview();
initCursorDot();
initMotion();
