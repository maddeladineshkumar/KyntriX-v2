import os
import glob
import re
import math
import struct
import json
import xml.etree.ElementTree as ET

SOURCE_ROOT = 'RoboAnalyzer_7_5_20190623'
DEST_ASSETS = 'robo-analyzer-web/public/assets/robots'
DEST_DATA = 'robo-analyzer-web/src/data/robots'

COLOR_MAP = {
    'gray': '#71717a',
    'grey': '#71717a',
    'sienna': '#a0522d',
    'red': '#ef4444',
    'thistle': '#d8b4e2',
    'teal': '#14b8a6',
    'magenta': '#d946ef',
    'yellow': '#eab308',
    'green': '#22c55e',
    'blue': '#3b82f6',
    'blueviolet': '#8b5cf6',
    'cyan': '#06b6d4',
    'crimson': '#dc2626',
    'peru': '#cd853f',
    'darkviolet': '#9400d3',
    'maroon': '#800000',
    'darkorange': '#f97316',
    'orange': '#f97316',
    'white': '#f8fafc',
    'black': '#1e293b'
}

def resolve_color(color_name):
    if not color_name:
        return '#94a3b8'
    return COLOR_MAP.get(color_name.strip().lower(), '#94a3b8')

def convert_ascii_stl_to_binary(src_path, dst_path):
    os.makedirs(os.path.dirname(dst_path), exist_ok=True)
    triangles = []
    
    with open(src_path, 'r', errors='ignore') as f:
        current_normal = [0.0, 0.0, 0.0]
        current_vertices = []
        for line in f:
            line = line.strip()
            if line.startswith('facet normal'):
                parts = line.split()
                if len(parts) >= 5:
                    current_normal = [float(parts[2]), float(parts[3]), float(parts[4])]
            elif line.startswith('vertex'):
                parts = line.split()
                if len(parts) >= 4:
                    current_vertices.append([float(parts[1]), float(parts[2]), float(parts[3])])
                    if len(current_vertices) == 3:
                        triangles.append((current_normal, current_vertices))
                        current_vertices = []
                        current_normal = [0.0, 0.0, 0.0]

    header = b'Binary STL generated for RoboAnalyzer Web Simulator' + b'\x00' * (80 - 50)
    with open(dst_path, 'wb') as out:
        out.write(header[:80])
        out.write(struct.pack('<I', len(triangles)))
        for norm, verts in triangles:
            # Scale mm to meters (1/1000)
            nx, ny, nz = norm
            v1x, v1y, v1z = [coord * 0.001 for coord in verts[0]]
            v2x, v2y, v2z = [coord * 0.001 for coord in verts[1]]
            v3x, v3y, v3z = [coord * 0.001 for coord in verts[2]]
            out.write(struct.pack('<ffffffffffffH', nx, ny, nz, v1x, v1y, v1z, v2x, v2y, v2z, v3x, v3y, v3z, 0))

    return len(triangles)

def parse_industrial_robot(xml_path, folder_name):
    tree = ET.parse(xml_path)
    root = tree.getroot()

    name = root.findtext('Name') or folder_name
    mfg = root.findtext('Manufacturer') or 'Industrial'
    model = root.findtext('ModelName') or folder_name
    payload = float(root.findtext('Payload') or 0)
    total_weight = float(root.findtext('TotalWeight') or 0)

    # Links
    links = []
    link_elems = root.findall('.//Link')
    for idx, l in enumerate(link_elems):
        fname = l.findtext('FileName') or f'link{idx}.stl'
        color = l.findtext('Color') or 'Gray'
        
        # Mass & Inertia if present
        mass = None
        mass_elem = l.find('MassProperty')
        if mass_elem is not None:
            mass = {
                'mass': float(mass_elem.findtext('Mass') or 0),
                'ixx': float(mass_elem.findtext('Ixx') or 0),
                'iyy': float(mass_elem.findtext('Iyy') or 0),
                'izz': float(mass_elem.findtext('Izz') or 0),
                'ixy': float(mass_elem.findtext('Ixy') or 0),
                'ixz': float(mass_elem.findtext('Ixz') or 0),
                'iyz': float(mass_elem.findtext('Iyz') or 0),
            }
        
        com = None
        cg_elem = l.find('CGProperty')
        if cg_elem is not None:
            com = [
                float(cg_elem.findtext('Rx') or 0),
                float(cg_elem.findtext('Ry') or 0),
                float(cg_elem.findtext('Rz') or 0)
            ]

        links.append({
            'id': f'{folder_name}_link{idx}',
            'name': f'Link {idx}' if idx > 0 else 'Base',
            'index': idx,
            'meshFile': f'/assets/robots/{folder_name}/link{idx}.stl',
            'color': resolve_color(color),
            'massProperty': mass,
            'centerOfMass': com
        })

    # Joints
    joints = []
    joint_elems = root.findall('.//RevoluteJoint') or root.findall('.//Joint')
    for idx, j in enumerate(joint_elems):
        offset_mm = float(j.findtext('JointOffset') or 0)
        angle_deg = float(j.findtext('JointAngle') or 0)
        length_mm = float(j.findtext('LinkLength') or 0)
        twist_deg = float(j.findtext('TwistAngle') or 0)
        min_deg = float(j.findtext('JointAngleMin') or -180)
        max_deg = float(j.findtext('JointAngleMax') or 180)

        joints.append({
            'id': f'{folder_name}_joint{idx+1}',
            'name': f'Joint {idx+1}',
            'index': idx,
            'type': 'revolute',
            'theta': 0.0,
            'd': offset_mm * 0.001,
            'a': length_mm * 0.001,
            'alpha': twist_deg * (math.pi / 180.0),
            'offset': 0.0,
            'min': min_deg * (math.pi / 180.0),
            'max': max_deg * (math.pi / 180.0),
            'home': angle_deg * (math.pi / 180.0)
        })

    return {
        'id': folder_name,
        'name': name,
        'manufacturer': mfg,
        'model': model,
        'dof': len(joints),
        'dhConvention': 'standard',
        'joints': joints,
        'links': links,
        'payload': payload,
        'totalWeight': total_weight
    }

def parse_skeleton_robot(xml_path):
    tree = ET.parse(xml_path)
    root = tree.getroot()

    selected = root.findtext('SelectedRobot') or os.path.splitext(os.path.basename(xml_path))[0]
    dof = int(root.findtext('DOF') or 1)

    joints = []
    joint_elems = root.findall('.//RAJoint')
    for idx, j in enumerate(joint_elems):
        jtype_attr = j.attrib.get('{http://www.w3.org/2001/XMLSchema-instance}type', 'RARevoluteJoint')
        is_prismatic = 'Prismatic' in jtype_attr
        
        length_mm = float(j.findtext('JointLength') or 0)
        twist_deg = float(j.findtext('TwistAngle') or 0)
        offset_mm = float(j.findtext('JointOffset') or 0)
        init_val = float(j.findtext('JVInitial') or 0)
        final_val = float(j.findtext('JVFinal') or 90)

        if is_prismatic:
            joints.append({
                'id': f'{selected}_j{idx+1}',
                'name': f'Joint {idx+1} (P)',
                'index': idx,
                'type': 'prismatic',
                'theta': 0.0,
                'd': 0.0,
                'a': length_mm * 0.001,
                'alpha': twist_deg * (math.pi / 180.0),
                'offset': 0.0,
                'min': 0.0,
                'max': max(final_val * 0.001, 0.5),
                'home': init_val * 0.001
            })
        else:
            joints.append({
                'id': f'{selected}_j{idx+1}',
                'name': f'Joint {idx+1} (R)',
                'index': idx,
                'type': 'revolute',
                'theta': 0.0,
                'd': offset_mm * 0.001,
                'a': length_mm * 0.001,
                'alpha': twist_deg * (math.pi / 180.0),
                'offset': 0.0,
                'min': -math.pi,
                'max': math.pi,
                'home': init_val * (math.pi / 180.0)
            })

    links = [{
        'id': f'{selected}_link0',
        'name': 'Base',
        'index': 0,
        'color': '#64748b'
    }]
    
    link_colors = ['#3b82f6', '#f97316', '#06b6d4', '#8b5cf6', '#10b981', '#ec4899', '#eab308']
    for idx in range(dof):
        links.append({
            'id': f'{selected}_link{idx+1}',
            'name': f'Link {idx+1}',
            'index': idx + 1,
            'color': link_colors[idx % len(link_colors)]
        })

    return {
        'id': f'skeleton_{selected}',
        'name': f'Skeleton {selected}',
        'manufacturer': 'Generic',
        'model': f'{dof}-DOF {selected}',
        'dof': dof,
        'dhConvention': 'standard',
        'joints': joints,
        'links': links
    }

def create_stanford_arm():
    # Stanford Arm: 6-DOF (R-R-P-R-R-R) with spherical wrist
    joints = [
        {
            'id': 'stanford_j1',
            'name': 'Joint 1 (Waist)',
            'index': 0,
            'type': 'revolute',
            'theta': 0.0,
            'd': 0.6604, # 26 inches base height
            'a': 0.0,
            'alpha': -math.pi / 2.0,
            'offset': 0.0,
            'min': -math.pi,
            'max': math.pi,
            'home': 0.0
        },
        {
            'id': 'stanford_j2',
            'name': 'Joint 2 (Shoulder)',
            'index': 1,
            'type': 'revolute',
            'theta': 0.0,
            'd': 0.162,
            'a': 0.0,
            'alpha': math.pi / 2.0,
            'offset': 0.0,
            'min': -math.pi / 2.0,
            'max': math.pi / 2.0,
            'home': 0.0
        },
        {
            'id': 'stanford_j3',
            'name': 'Joint 3 (Boom Prismatic)',
            'index': 2,
            'type': 'prismatic',
            'theta': 0.0,
            'd': 0.381,
            'a': 0.0,
            'alpha': 0.0,
            'offset': 0.0,
            'min': 0.1,
            'max': 1.0,
            'home': 0.381
        },
        {
            'id': 'stanford_j4',
            'name': 'Joint 4 (Wrist Roll)',
            'index': 3,
            'type': 'revolute',
            'theta': 0.0,
            'd': 0.0,
            'a': 0.0,
            'alpha': -math.pi / 2.0,
            'offset': 0.0,
            'min': -math.pi,
            'max': math.pi,
            'home': 0.0
        },
        {
            'id': 'stanford_j5',
            'name': 'Joint 5 (Wrist Pitch)',
            'index': 4,
            'type': 'revolute',
            'theta': 0.0,
            'd': 0.0,
            'a': 0.0,
            'alpha': math.pi / 2.0,
            'offset': 0.0,
            'min': -math.pi / 2.0,
            'max': math.pi / 2.0,
            'home': 0.0
        },
        {
            'id': 'stanford_j6',
            'name': 'Joint 6 (Wrist Yaw)',
            'index': 5,
            'type': 'revolute',
            'theta': 0.0,
            'd': 0.15,
            'a': 0.0,
            'alpha': 0.0,
            'offset': 0.0,
            'min': -math.pi,
            'max': math.pi,
            'home': 0.0
        }
    ]

    links = []
    for idx in range(7):
        links.append({
            'id': f'stanford_link{idx}',
            'name': f'Link {idx}' if idx > 0 else 'Base',
            'index': idx,
            'meshFile': f'/assets/robots/Stanford/link{idx}.stl',
            'color': resolve_color(['Gray', 'Sienna', 'Yellow', 'Blue', 'Green', 'Magenta', 'Cyan'][idx])
        })

    return {
        'id': 'Stanford',
        'name': 'Stanford Arm',
        'manufacturer': 'Stanford',
        'model': 'Stanford Arm (RRP-RRR)',
        'dof': 6,
        'dhConvention': 'standard',
        'joints': joints,
        'links': links,
        'payload': 2.0,
        'totalWeight': 40.0
    }

def convert_thanks_csv():
    src_csv = os.path.join(SOURCE_ROOT, 'VirtualRobotXML', 'Thanks3.csv')
    dst_json = os.path.join(DEST_DATA, 'thanksTrajectory.json')
    if not os.path.exists(src_csv):
        return
    
    waypoints = []
    with open(src_csv, 'r') as f:
        for idx, line in enumerate(f):
            parts = line.strip().split(',')
            if len(parts) >= 6:
                x = float(parts[0]) * 0.001
                y = float(parts[1]) * 0.001
                z = float(parts[2]) * 0.001
                rx = float(parts[3]) * (math.pi / 180.0)
                ry = float(parts[4]) * (math.pi / 180.0)
                rz = float(parts[5]) * (math.pi / 180.0)
                waypoints.append({
                    'index': idx,
                    'position': [x, y, z],
                    'euler': [rx, ry, rz]
                })

    with open(dst_json, 'w') as out:
        json.dump({'name': 'Thanks3 Trajectory', 'count': len(waypoints), 'waypoints': waypoints}, out, indent=2)
    print(f'Converted Thanks3.csv -> {dst_json} ({len(waypoints)} waypoints)')

def main():
    os.makedirs(DEST_ASSETS, exist_ok=True)
    os.makedirs(DEST_DATA, exist_ok=True)

    catalog = []

    # 1. Industrial CAD Robots
    robot_dirs = sorted([d for d in os.listdir(os.path.join(SOURCE_ROOT, 'Robots')) if os.path.isdir(os.path.join(SOURCE_ROOT, 'Robots', d))])
    for rf in robot_dirs:
        xml_file = os.path.join(SOURCE_ROOT, 'Robots', rf, 'robot.xml')
        if os.path.exists(xml_file):
            try:
                robot_def = parse_industrial_robot(xml_file, rf)
                catalog.append(robot_def)
                
                # Write individual json
                out_path = os.path.join(DEST_DATA, f'{rf}.json')
                with open(out_path, 'w') as out:
                    json.dump(robot_def, out, indent=2)
                print(f"Parsed robot: {rf} (DOF: {robot_def['dof']})")
            except Exception as e:
                print(f'Error parsing {rf}: {e}')

        # Convert STLs for this robot
        stls = sorted(glob.glob(os.path.join(SOURCE_ROOT, 'Robots', rf, '*.stl')))
        for s in stls:
            base_name = os.path.basename(s).lower().replace(' ', '')
            if re.match(r'link\d\.stl', base_name):
                dst_stl = os.path.join(DEST_ASSETS, rf, base_name)
                tri_count = convert_ascii_stl_to_binary(s, dst_stl)

    # 2. Stanford Arm from 3DModels
    stanford_stls = sorted(glob.glob(os.path.join(SOURCE_ROOT, '3DModels', 'Stanford', '*.stl')))
    for s in stanford_stls:
        base_name = os.path.basename(s).lower()
        dst_stl = os.path.join(DEST_ASSETS, 'Stanford', base_name)
        convert_ascii_stl_to_binary(s, dst_stl)
    
    stanford_def = create_stanford_arm()
    catalog.append(stanford_def)
    with open(os.path.join(DEST_DATA, 'Stanford.json'), 'w') as out:
        json.dump(stanford_def, out, indent=2)
    print('Created Stanford Arm definition and converted STLs.')

    # 3. Default Skeletons
    skeleton_files = sorted(glob.glob(os.path.join(SOURCE_ROOT, 'DefaultRobots', '*.xml')))
    for sf in skeleton_files:
        try:
            sk_def = parse_skeleton_robot(sf)
            catalog.append(sk_def)
            robot_id = sk_def['id']
            out_path = os.path.join(DEST_DATA, f'{robot_id}.json')
            with open(out_path, 'w') as out:
                json.dump(sk_def, out, indent=2)
        except Exception as e:
            print(f'Error parsing skeleton {sf}: {e}')

    # Write Master Catalog
    with open(os.path.join(DEST_DATA, 'robotsCatalog.json'), 'w') as out:
        json.dump(catalog, out, indent=2)
    print(f'Master Catalog generated with {len(catalog)} robots.')

    # Convert Trajectory
    convert_thanks_csv()

if __name__ == '__main__':
    main()
