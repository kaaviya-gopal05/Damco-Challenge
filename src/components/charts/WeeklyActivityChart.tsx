import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import type { DailyActivityPoint } from '@/services/activity.service';

export function WeeklyActivityChart({ data }: { data: DailyActivityPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly activity</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9494a6', fontSize: 12 }}
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9494a6', fontSize: 12 }} />
              <Tooltip
                cursor={{ fill: '#f2f4ff' }}
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid #dcdce3',
                  fontSize: 12,
                }}
              />
              <Bar
                dataKey="minutesStudied"
                name="Minutes studied"
                fill="#5b5ff0"
                radius={[6, 6, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
