import {directVisualBeat, storyAttentionPlan} from './story/visual-director';

const formats = ['SHORT', 'LONGFORM'] as const;
const roles = ['hook', 'stakes', 'decision', 'reversal', 'reveal', 'payoff', 'breathing_room'];

for (const format of formats) {
  const plan = storyAttentionPlan(format);
  if (plan.maximum_open_loops < 1) throw new Error(`${format}: invalid open-loop budget`);
  for (const role of roles) {
    const direction = directVisualBeat(role, format);
    if (!direction.visual_strategy || direction.tension_level < 0 || direction.tension_level > 10) {
      throw new Error(`${format}/${role}: invalid psychology direction`);
    }
    if (direction.beat_range_seconds.minSeconds >= direction.beat_range_seconds.maxSeconds) {
      throw new Error(`${format}/${role}: invalid visual beat range`);
    }
  }
}

const short = storyAttentionPlan('SHORT');
const long = storyAttentionPlan('LONGFORM');
if (short.interruption_density <= long.interruption_density) throw new Error('Shorts must have higher interruption density than long-form');
if (short.micro_payoff_interval_seconds >= long.micro_payoff_interval_seconds) throw new Error('Long-form must have longer payoff spacing than Shorts');
if (short.breathing_room >= long.breathing_room) throw new Error('Long-form must have more breathing room than Shorts');

console.log('Psychology/visual direction checks passed: SHORT + LONGFORM');
