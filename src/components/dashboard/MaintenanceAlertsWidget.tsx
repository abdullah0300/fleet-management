'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useUpcomingMaintenance, useOverdueMaintenance } from "@/hooks/useMaintenance"
import { AlertCircle, Calendar, Wrench } from "lucide-react"

export function MaintenanceAlertsWidget() {
    const { data: upcoming } = useUpcomingMaintenance()
    const { data: overdue } = useOverdueMaintenance()

    const overdueList = overdue || []
    const upcomingList = upcoming || []

    return (
        <Card className="col-span-1 h-[450px] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xl font-bold">Maintenance Alerts</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto space-y-6">

                {/* Overdue Section */}
                <div>
                    <h4 className="text-sm font-semibold text-red-600 flex items-center mb-3">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Urgent ({overdueList.length})
                    </h4>
                    <div className="space-y-4">
                        {overdueList.length === 0 ? (
                            <p className="text-xs text-muted-foreground ml-6">No overdue maintenance.</p>
                        ) : (
                            overdueList.map(record => (
                                <div key={record.id} className="flex flex-col gap-1 ml-6 pb-2 border-b last:border-0 border-dashed">
                                    <div className="font-medium text-sm">{record.type || 'Maintenance'} overdue</div>
                                    <div className="text-xs text-muted-foreground">
                                        Vehicle #{record.vehicles?.registration_number}
                                    </div>
                                    <div className="text-xs text-red-500 font-medium">
                                        {record.next_service_date ? new Date(record.next_service_date).toLocaleDateString() : 'Date Unknown'}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Upcoming Section */}
                <div>
                    <h4 className="text-sm font-semibold text-amber-500 flex items-center mb-3">
                        <Calendar className="h-4 w-4 mr-2" />
                        Upcoming ({upcomingList.length})
                    </h4>
                    <div className="space-y-4">
                        {upcomingList.length === 0 ? (
                            <p className="text-xs text-muted-foreground ml-6">No upcoming maintenance.</p>
                        ) : (
                            upcomingList.map(record => (
                                <div key={record.id} className="flex flex-col gap-1 ml-6 pb-2 border-b last:border-0 border-dashed">
                                    <div className="font-medium text-sm">{record.type || 'Maintenance'}</div>
                                    <div className="text-xs text-muted-foreground">
                                        Vehicle #{record.vehicles?.registration_number}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {record.next_service_date ? new Date(record.next_service_date).toLocaleDateString() : 'Date Unknown'}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="pt-4 text-center">
                    <button className="text-xs text-blue-600 font-medium hover:underline">
                        View All Maintenance
                    </button>
                </div>

            </CardContent>
        </Card>
    )
}
