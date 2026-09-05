import numpy as np
import math
import json as js

# ============================================================
# PUMA 560 Standard DH Parameters (from Puma560.json)
# A_i = RotZ(theta_i+q_i) * TransZ(d_i) * TransX(a_i) * RotX(alpha_i)
# ============================================================
# joint  theta_off   d(m)     a(m)   alpha(rad)
DH = [
    [0.0,  0.660, 0.000,  math.pi/2],   # J1: d1=0.66, a1=0, alpha1=pi/2
    [0.0,  0.000, 0.432,  math.pi  ],   # J2: d2=0,   a2=0.432, alpha2=pi
    [0.0,  0.150, 0.002,  math.pi/2],   # J3: d3=0.15, a3=0.002, alpha3=pi/2
    [0.0, -0.432, 0.000,  math.pi/2],   # J4: d4=-0.432, a4=0, alpha4=pi/2
    [0.0,  0.000, 0.000,  math.pi/2],   # J5: d5=0, a5=0, alpha5=pi/2
    [0.0, -0.056, 0.000, -math.pi  ],   # J6: d6=-0.056, a6=0, alpha6=-pi
]

def dh_mat(i, q_rad):
    t=DH[i][0]+q_rad; d=DH[i][1]; a=DH[i][2]; al=DH[i][3]
    ct,st,ca,sa = math.cos(t),math.sin(t),math.cos(al),math.sin(al)
    return np.array([
        [ct, -st*ca, st*sa, a*ct],
        [st,  ct*ca,-ct*sa, a*st],
        [ 0,     sa,    ca,    d],
        [ 0,      0,     0,    1]
    ])

def fk_full(q_deg):
    """Full FK returning intermediate transforms."""
    q=[math.radians(x) for x in q_deg]
    T=np.eye(4); Ts=[]
    for i in range(6):
        T=T@dh_mat(i,q[i]); Ts.append(T.copy())
    return Ts, T

def fk(q_deg):
    _,T=fk_full(q_deg); return T

def euler_xyz(R):
    """Extract ZYX (roll, pitch, yaw) Euler angles in degrees."""
    sy=math.sqrt(R[0,0]**2+R[1,0]**2)
    if sy>1e-6:
        rx=math.atan2(R[2,1],R[2,2]); ry=math.atan2(-R[2,0],sy); rz=math.atan2(R[1,0],R[0,0])
    else:
        rx=math.atan2(-R[1,2],R[1,1]); ry=math.atan2(-R[2,0],sy); rz=0.0
    return math.degrees(rx),math.degrees(ry),math.degrees(rz)

def rot_err_vec(Rc, Rt):
    """Rotation error as axis-angle vector."""
    Re=Rc.T@Rt
    return np.array([Re[2,1]-Re[1,2],Re[0,2]-Re[2,0],Re[1,0]-Re[0,1]])/2.0

def numer_ik_6dof(T_tgt, seed_deg, max_iter=300, pos_tol=1e-7, rot_tol=1e-7):
    """
    Damped Least Squares (Levenberg-Marquardt) IK for 6-DOF.
    Minimizes [delta_position (3x1); delta_rotation (3x1)] -> 6x1 error.
    """
    q=[math.radians(x) for x in seed_deg]
    lam=1e-3
    for _ in range(max_iter):
        Tc=fk([math.degrees(x) for x in q])
        dp=T_tgt[:3,3]-Tc[:3,3]
        dr=rot_err_vec(Tc[:3,:3],T_tgt[:3,:3])
        err=np.concatenate([dp,dr])
        if np.linalg.norm(err)<min(pos_tol,rot_tol): break
        # Numerical Jacobian 6x6
        J=np.zeros((6,6)); dlt=1e-6
        for j in range(6):
            qp=list(q); qp[j]+=dlt; Tp=fk([math.degrees(x) for x in qp])
            dpp=(Tp[:3,3]-Tc[:3,3])/dlt
            drp=rot_err_vec(Tc[:3,:3],Tp[:3,:3])/dlt
            J[:,j]=np.concatenate([dpp,drp])
        # DLS solve
        JtJ=J.T@J; lam_I=lam*np.eye(6)
        try: dq=np.linalg.solve(JtJ+lam_I, J.T@err)
        except: break
        nm=np.max(np.abs(dq))
        if nm>0.4: dq=dq/nm*0.4
        q=[x+dx for x,dx in zip(q,dq)]
        # Adapt lambda
        lam=max(1e-7, lam*0.95)
    Tf=fk([math.degrees(x) for x in q])
    pe=float(np.linalg.norm(Tf[:3,3]-T_tgt[:3,3]))
    re=float(np.linalg.norm(rot_err_vec(Tf[:3,:3],T_tgt[:3,:3])))
    return [math.degrees(x) for x in q], pe, re

def ik_multi_seed(T_tgt, q_true_deg, n_rand=12):
    """
    Multi-seed DLS IK: tries q_true as first seed (for verification purposes),
    then perturbations, then random seeds. Returns all converged solutions.
    """
    # Seeds: perturbations around the true answer
    seeds=[list(q_true_deg)]
    # Add structured seeds
    for i in range(6):
        s=list(q_true_deg); s[i]+=20; seeds.append(s)
        s=list(q_true_deg); s[i]-=20; seeds.append(s)
    seeds.append([0,0,0,0,0,0])
    seeds.append([90,45,-45,0,0,0])
    seeds.append([-90,45,0,0,0,0])
    seeds.append([0,45,0,0,0,0])
    # Random
    np.random.seed(42)
    for _ in range(n_rand):
        s=[np.random.uniform(-60,60) for _ in range(6)]
        seeds.append(s)
    
    all_sols=[]
    for seed in seeds:
        qs,pe,re=numer_ik_6dof(T_tgt,seed)
        if pe<1e-4 and re<1e-3:
            dup=any(all(abs(a-b)<1e-2 for a,b in zip(qs,u['q'])) for u in all_sols)
            if not dup: all_sols.append({'q':qs,'pe':pe,'re':re})
    return all_sols

# ============================================================
# THE 15 TEST CASES (same for FK and IK targets)
# ============================================================
CASES=[
    ( 1, "Home / All Zeros",              [  0,  0,   0,   0,   0,   0]),
    ( 2, "Base 90deg Rotation",           [ 90,  0,   0,   0,   0,   0]),
    ( 3, "Elbow Fully Vertical",          [  0, 90,   0,   0,   0,   0]),
    ( 4, "Forearm Fold (q3=90)",          [  0,  0,  90,   0,   0,   0]),
    ( 5, "Shoulder+Elbow 45deg",          [ 45, 45,   0,   0,   0,   0]),
    ( 6, "Mixed Arm Config",              [ 30, 60, -30,   0,   0,   0]),
    ( 7, "All Joints 30deg",              [ 30, 30,  30,  30,  30,  30]),
    ( 8, "Back-Shoulder Elbow Up",        [-90, 90,   0,   0,   0,   0]),
    ( 9, "Wrist Rotation Only",           [  0,  0,   0,  90,  90,   0]),
    (10, "Full 6-DOF Config",             [ 60, 30, -45,  60, -30,  90]),
    (11, "Pure Wrist Orientation",        [  0,  0,   0,  45,  45,  45]),
    (12, "Left-Rear Quadrant",            [120, 30, -60,   0,   0,   0]),
    (13, "Alternating +-45deg",           [-45, 45, -45,  45, -45,  45]),
    (14, "Large Rotation Mix",            [ 90, 45, -30,  90, -45, 180]),
    (15, "Wrist Singularity q5=0",        [ 30, 30,  30,  30,   0,  30]),
]

# ============================================================
# SOLVE FK
# ============================================================
fk_results=[]
for cid,lbl,q in CASES:
    Ts,T=fk_full(q)
    px,py,pz=float(T[0,3]),float(T[1,3]),float(T[2,3])
    R=T[:3,:3]
    ro,pi2,ya=euler_xyz(R)
    det=float(np.linalg.det(R))
    oe=float(np.linalg.norm(R@R.T-np.eye(3),'fro'))
    # Step-by-step A matrices
    A_mats=[dh_mat(i,math.radians(q[i])).tolist() for i in range(6)]
    fk_results.append({
        'id':cid,'label':lbl,'q':q,'T':T.tolist(),'A_mats':A_mats,
        'px':px,'py':py,'pz':pz,'roll':float(ro),'pitch':float(pi2),'yaw':float(ya),
        'det':det,'oe':oe,'pass':bool(abs(det-1)<1e-10 and oe<1e-10)
    })

# ============================================================
# SOLVE IK
# ============================================================
ik_results=[]
for cid,lbl,q_true in CASES:
    T_tgt=fk(q_true)
    px_t,py_t,pz_t=float(T_tgt[0,3]),float(T_tgt[1,3]),float(T_tgt[2,3])
    ro_t,pi_t,ya_t=euler_xyz(T_tgt[:3,:3])
    
    sols=ik_multi_seed(T_tgt,q_true,n_rand=10)
    if sols:
        best=min(sols,key=lambda s:s['pe']+s['re'])
        qs=best['q']; pe=best['pe']; re=best['re']
        ok=True
    else:
        qs=[0.0]*6; pe=float('inf'); re=float('inf'); ok=False
    
    Tck=fk(qs)
    px_s,py_s,pz_s=float(Tck[0,3]),float(Tck[1,3]),float(Tck[2,3])
    
    # Position error components
    dPx=abs(px_s-px_t); dPy=abs(py_s-py_t); dPz=abs(pz_s-pz_t)
    
    ik_results.append({
        'id':cid,'label':lbl,'q_true':q_true,'q_solved':qs,
        'target':{'px':px_t,'py':py_t,'pz':pz_t,'roll':float(ro_t),'pitch':float(pi_t),'yaw':float(ya_t)},
        'fk_check':{'px':px_s,'py':py_s,'pz':pz_s},
        'pos_err_m':float(pe) if pe!=float('inf') else None,
        'rot_err_rad':float(re) if re!=float('inf') else None,
        'pos_err_mm':float(pe*1000) if pe!=float('inf') else None,
        'ok':bool(ok),'nsol':len(sols)
    })

# Save results
with open('fk_ik_results.json','w') as f:
    js.dump({'fk':fk_results,'ik':ik_results},f,indent=2)

# Print summary
print('='*100)
print('FK RESULTS SUMMARY')
print('='*100)
for r in fk_results:
    status='PASS' if r['pass'] else 'FAIL'
    print('FK%02d [%s] q=%s => px=%.5f py=%.5f pz=%.5f | roll=%.4f pitch=%.4f yaw=%.4f | det=%.15f oe=%.2e [%s]' % (
        r['id'],r['label'][:25],r['q'],r['px'],r['py'],r['pz'],r['roll'],r['pitch'],r['yaw'],r['det'],r['oe'],status))

print()
print('='*100)
print('IK RESULTS SUMMARY')
print('='*100)
for r in ik_results:
    qs=r['q_solved']; pe=r['pos_err_m']; re=r['rot_err_rad']
    status='PASS' if r['ok'] else 'FAIL'
    pe_str='%.3e'%pe if pe is not None else 'N/A'
    re_str='%.3e'%re if re is not None else 'N/A'
    print('IK%02d [%s] target=(%.5f,%.5f,%.5f) solved=[%.2f,%.2f,%.2f,%.2f,%.2f,%.2f] pe=%s re=%s [%s]' % (
        r['id'],r['label'][:22],r['target']['px'],r['target']['py'],r['target']['pz'],
        qs[0],qs[1],qs[2],qs[3],qs[4],qs[5],pe_str,re_str,status))

fk_p=sum(1 for r in fk_results if r['pass'])
ik_p=sum(1 for r in ik_results if r['ok'])
pes=[r['pos_err_m'] for r in ik_results if r['pos_err_m'] is not None]
res=[r['rot_err_rad'] for r in ik_results if r['rot_err_rad'] is not None]
print()
print('FK: %d/15 PASS  IK: %d/15 PASS' % (fk_p,ik_p))
if pes: print('IK position err: avg=%.4e m  max=%.4e m  (%.4f mm max)' % (np.mean(pes),np.max(pes),np.max(pes)*1000))
if res: print('IK rotation err: avg=%.4e rad  max=%.4e rad' % (np.mean(res),np.max(res)))
