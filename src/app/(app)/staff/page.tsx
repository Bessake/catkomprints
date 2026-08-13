import {
  deleteFloorStaffAction,
  toggleFloorStaffAction,
} from "@/app/operator/actions";
import { FloorStaffForm } from "@/components/floor-staff-form";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Staff members",
};

export default async function StaffPage() {
  const staff = await prisma.floorStaff.findMany({
    include: { _count: { select: { movements: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <div className="page-header">
        <div>
          <p className="eyebrow">Floor</p>
          <h1>Staff members</h1>
          <p className="muted" style={{ margin: "0.4rem 0 0" }}>
            Names available on the stock out terminal so each take-out is
            attributed to the right person.
          </p>
        </div>
      </div>

      <div className="detail-layout">
        <section className="panel">
          <h2>All staff</h2>
          {staff.length === 0 ? (
            <p className="muted">No staff names yet.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Stock outs</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {staff.map((member) => {
                    const toggle = toggleFloorStaffAction.bind(null, member.id);
                    const remove = deleteFloorStaffAction.bind(null, member.id);
                    return (
                      <tr key={member.id}>
                        <td>{member.name}</td>
                        <td>{member._count.movements}</td>
                        <td>
                          {member.active ? (
                            <span className="badge">Active</span>
                          ) : (
                            <span className="badge inactive">Inactive</span>
                          )}
                        </td>
                        <td>
                          <div className="actions">
                            <form action={toggle}>
                              <button type="submit" className="button secondary">
                                {member.active ? "Deactivate" : "Activate"}
                              </button>
                            </form>
                            <form action={remove}>
                              <button type="submit" className="button danger">
                                Delete
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel">
          <h2>Add staff</h2>
          <FloorStaffForm />
        </section>
      </div>
    </>
  );
}
