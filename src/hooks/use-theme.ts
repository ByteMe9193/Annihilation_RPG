import { Colors } from "@/constants/theme";
import { useAppTheme } from "@/theme/AppTheme";

export function useTheme() {
  const { mode } = useAppTheme();
  return Colors[mode];
}
