import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getGroupDetail } from "@/api/groups";
import { getExpenses } from "@/api/expenses";

const GROUP_SCHEDULES_KEY = "group_schedules_v1";

function loadGroupSchedule(groupId) {
  try {
    const raw = localStorage.getItem(GROUP_SCHEDULES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed[groupId] || null;
  } catch {
    return null;
  }
}

function toDateKey(input) {
  const d = new Date(input);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function startOfDay(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

function endOfDay(dateKey) {
  const dt = startOfDay(dateKey);
  dt.setHours(23, 59, 59, 999);
  return dt;
}

function addDays(dateKey, delta) {
  const d = startOfDay(dateKey);
  d.setDate(d.getDate() + delta);
  return toDateKey(d);
}

function buildDateRange(startKey, endKey) {
  if (!startKey || !endKey) return [];
  if (startKey > endKey) return [];
  const out = [];
  let cur = startKey;
  while (cur <= endKey) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

function calcExpenseTotal(e) {
  // API 응답 형식: totalAmount는 이미 숫자로 제공됨
  return e.totalAmount || 0;
}

export default function RoomHomePage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [tripStart, setTripStart] = useState(null);
  const [tripEnd, setTripEnd] = useState(null);

  const dateList = useMemo(
    () => buildDateRange(tripStart, tripEnd),
    [tripStart, tripEnd],
  );

  const [viewMode, setViewMode] = useState("LIST");
  const [selectedDate, setSelectedDate] = useState("");

  // 그룹 정보 및 지출 목록 조회
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        const [groupData, expensesData] = await Promise.all([
          getGroupDetail(Number(roomId)),
          getExpenses(Number(roomId)),
        ]);

        setGroup(groupData);
        setExpenses(expensesData?.expenses || []);

        // 로컬에서 일정 불러오기 (백엔드 미구현)
        const schedule = loadGroupSchedule(Number(roomId));
        if (schedule) {
          setTripStart(schedule.tripStart || null);
          setTripEnd(schedule.tripEnd || null);
          if (schedule.tripStart) {
            setSelectedDate(schedule.tripStart);
          }
        }
      } catch (e) {
        console.error("데이터 조회 실패:", e);
        setError(e?.message || "데이터를 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [roomId, location.key]);

  useEffect(() => {
    if (tripStart) {
      setSelectedDate(tripStart);
    }
  }, [tripStart]);

  // 여행 기간 내 지출 필터링
  const inTripRange = useMemo(() => {
    if (!tripStart || !tripEnd) return expenses;
    const s = startOfDay(tripStart);
    const e = endOfDay(tripEnd);
    return expenses.filter((it) => {
      const dt = new Date(it.spentAt);
      return dt >= s && dt <= e;
    });
  }, [expenses, tripStart, tripEnd]);

  // 선택한 날짜의 지출 필터링
  const inSelectedDay = useMemo(() => {
    if (!selectedDate) return [];
    const s = startOfDay(selectedDate);
    const e = endOfDay(selectedDate);
    return inTripRange.filter((it) => {
      const dt = new Date(it.spentAt);
      return dt >= s && dt <= e;
    });
  }, [inTripRange, selectedDate]);

  const totalAmount = useMemo(() => {
    return inTripRange.reduce((sum, e) => sum + calcExpenseTotal(e), 0);
  }, [inTripRange]);

  const goAdd = useCallback(() => {
    navigate(`/rooms/${roomId}/add-expense`);
  }, [navigate, roomId]);

  const goSettlement = useCallback(() => {
    navigate(`/rooms/${roomId}/settlement`);
  }, [navigate, roomId]);

  const ExpenseCard = ({ e }) => {
    const total = calcExpenseTotal(e);
    const dateStr = e.spentAt ? toDateKey(e.spentAt) : "";
    const settlementType = e.settlementType === "ITEMIZED" ? "혼합정산(품목/공동)" : "기본";
    return (
      <Card className="hover:shadow-sm transition">
        <CardContent className="p-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="font-semibold truncate">{e.title}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              날짜: {dateStr} · 결제자 : {e.payerUserId.nickname} · {settlementType}
            </div>
          </div>
          <div className="font-bold whitespace-nowrap">
            {Number(total).toLocaleString()}원
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-muted-foreground">
              데이터를 불러오는 중...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Card className="border-destructive">
          <CardContent className="p-6">
            <div className="text-sm text-destructive">{error}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-muted-foreground">
              그룹을 찾을 수 없습니다.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">여행 요약</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="text-xs text-muted-foreground">여행 기간</div>
              <div className="font-semibold">
                {tripStart && tripEnd
                  ? `${tripStart} ~ ${tripEnd}`
                  : "여행 기간 정보 없음"}
              </div>

              <div className="mt-3 text-xs text-muted-foreground">
                기간 총 지출
              </div>
              <div className="text-2xl font-extrabold tracking-tight">
                {totalAmount.toLocaleString()}원
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={goAdd}>+ 지출 등록</Button>
              <Button variant="outline" onClick={goSettlement}>
                정산
              </Button>
            </div>
          </div>

          <Separator />

          <div className="flex gap-2 flex-wrap">
            <Button
              variant={viewMode === "LIST" ? "default" : "outline"}
              onClick={() => setViewMode("LIST")}
            >
              전체 내역
            </Button>

            <Button
              variant={viewMode === "DAY" ? "default" : "outline"}
              onClick={() => setViewMode("DAY")}
              disabled={dateList.length === 0}
            >
              날짜별 보기
            </Button>
          </div>

          {viewMode === "DAY" && (
            <div className="flex gap-2 flex-wrap">
              {dateList.map((d) => (
                <Button
                  key={d}
                  variant={selectedDate === d ? "default" : "ghost"}
                  onClick={() => setSelectedDate(d)}
                >
                  {d}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {!tripStart || !tripEnd ? (
        <Card>
          <CardContent className="p-4 text-sm text-destructive">
            방에 여행 기간(tripStart/tripEnd)이 저장되어 있지 않습니다.
            RoomsPage 저장 로직을 확인해주세요.
          </CardContent>
        </Card>
      ) : inTripRange.length === 0 ? (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            여행 기간 내 지출이 없습니다. <b>+ 지출 등록</b>으로 추가해보세요.
          </CardContent>
        </Card>
      ) : viewMode === "LIST" ? (
        <div className="grid gap-3">
          {inTripRange
            .slice()
            .sort((a, b) => (a.spentAt < b.spentAt ? 1 : -1))
            .map((e) => (
              <ExpenseCard key={e.expenseId} e={e} />
            ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="font-semibold">{selectedDate || "(날짜 선택)"}</div>
          {inSelectedDay.length === 0 ? (
            <Card>
              <CardContent className="p-4 text-sm text-muted-foreground">
                선택한 날짜에 지출이 없습니다.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {inSelectedDay
                .slice()
                .sort((a, b) => (a.spentAt < b.spentAt ? 1 : -1))
                .map((e) => (
                  <ExpenseCard key={e.expenseId} e={e} />
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
