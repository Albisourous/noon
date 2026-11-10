import { HStack, Image, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  containerBackground,
  font,
  foregroundStyle,
  padding,
  strikethrough,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

export type BoardWidgetRow = {
  handle: string;
  score: number | null;
  status: 'scored' | 'missed' | null;
  confidence: 'solid' | 'building' | null;
  isSelf: boolean;
};

export type SleepBoardProps = {
  wake_date: string;
  rows: BoardWidgetRow[];
};

// Rounded system type stands in for Nunito — custom fonts bundled in the
// app target are not loaded inside the widget extension process.
const SleepBoard = (
  props: SleepBoardProps,
  environment: WidgetEnvironment,
) => {
  'widget';
  const BG = '#151231';
  const TEXT = '#f2efe6';
  const SECONDARY = '#a29cc4';
  const ACCENT = '#a78bfa';
  const WARM = '#f0b86e';
  const POOR = '#c98a9b';

  const isSmall = environment.widgetFamily === 'systemSmall';
  const isMedium = environment.widgetFamily === 'systemMedium';
  const maxRows = isSmall ? 3 : isMedium ? 4 : 7;
  const rows = props.rows.slice(0, maxRows);

  const scoreColor = (r: BoardWidgetRow) =>
    r.status === 'missed'
      ? POOR
      : r.score === null
        ? SECONDARY
        : r.score > 85
          ? WARM
          : r.score < 70
            ? POOR
            : ACCENT;

  const scoreText = (r: BoardWidgetRow) =>
    r.status === 'missed'
      ? 'missed'
      : r.score === null
        ? 'pending'
        : `${r.confidence === 'building' ? '~' : ''}${r.score}`;

  return (
    <VStack
      modifiers={[
        containerBackground(BG, 'widget'),
        widgetURL('sleeple://'),
        padding({ all: 14 }),
      ]}
      spacing={8}
      alignment="leading"
    >
      {!isSmall ? (
        <HStack>
          <Image
            systemName="moon.zzz.fill"
            modifiers={[foregroundStyle(ACCENT)]}
          />
          <Spacer />
          <Text
            modifiers={[
              font({ size: 11, weight: 'semibold', design: 'rounded' }),
              foregroundStyle(SECONDARY),
            ]}
          >
            {"today's board"}
          </Text>
        </HStack>
      ) : null}
      {rows.length === 0 ? (
        <>
          <Spacer />
          <Text
            modifiers={[
              font({ size: 14, weight: 'semibold', design: 'rounded' }),
              foregroundStyle(SECONDARY),
            ]}
          >
            {'check in at noon'}
          </Text>
          <Spacer />
        </>
      ) : (
        rows.map((r, i) => (
          <HStack key={i} spacing={6}>
            <Text
              modifiers={[
                font({ size: 14, weight: 'semibold', design: 'rounded' }),
                foregroundStyle(r.isSelf ? ACCENT : TEXT),
                ...(r.status === 'missed'
                  ? [strikethrough({ isActive: true, pattern: 'solid' })]
                  : []),
              ]}
            >
              {r.handle + (r.isSelf ? ' (you)' : '')}
            </Text>
            <Spacer />
            <Text
              modifiers={[
                font({ size: 14, weight: 'bold', design: 'rounded' }),
                foregroundStyle(scoreColor(r)),
              ]}
            >
              {scoreText(r)}
            </Text>
          </HStack>
        ))
      )}
      <Spacer />
    </VStack>
  );
};

export default createWidget<SleepBoardProps>('SleepBoard', SleepBoard, {
  wake_date: '',
  rows: [],
});
