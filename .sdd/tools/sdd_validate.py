#!/usr/bin/env python3
"""SDD document checks. Standard library only; never executes recorded commands."""
import argparse
import hashlib
import re
import sys
from pathlib import Path

START = '<!-- sdd:progress:start -->'
END = '<!-- sdd:progress:end -->'
STATES = ('PENDING', 'IN_PROGRESS', 'TESTING', 'COMPLETED', 'BLOCKED')
SYMBOL = dict(zip(STATES, (' ', '/', '?', 'x', '!')))
TASK = re.compile(r'^### (T[1-9]\d*\.[1-9]\d*) (.+)$', re.M)
FIELD = re.compile(r'^\*\*([^*\n]+):\*\*[ \t]*(.*?)[ \t]*$', re.M)


class Invalid(ValueError):
    pass


def require(condition, message):
    if not condition:
        raise Invalid(message)


def read(path):
    require(path.is_file(), f'Falta archivo: {path}')
    return path.read_text(encoding='utf-8-sig')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def meta(text, key):
    values = re.findall(r'^' + re.escape(key) + r':[ \t]*(\S.*?)[ \t]*$', text, re.M)
    require(len(values) == 1, f'Se requiere una sola línea {key}: VALOR')
    return values[0]


def set_meta(text, key, value):
    pattern = r'^' + re.escape(key) + r':[^\n]*$'
    require(len(re.findall(pattern, text, re.M)) <= 1, f'Metadato duplicado: {key}')
    if re.search(pattern, text, re.M):
        return re.sub(pattern, f'{key}: {value}', text, flags=re.M)
    if END in text:
        return text.replace(END, END + f'\n\n{key}: {value}', 1)
    title, rest = text.split('\n', 1)
    return f'{title}\n{key}: {value}\n{rest}'


def concrete(value):
    return bool(value.strip(' `—-')) and not re.search(
        r'pendiente|pending|not_run|por ejecutar|<[^>]+>', value, re.I)


def parse_tasks(text):
    matches = list(TASK.finditer(text))
    require(matches, 'No hay tareas detalladas con título ### Tn.n [TIPO] Nombre')
    all_titles = re.findall(r'^### T\S*.*$', text, re.M)
    require(len(all_titles) == len(matches), 'Título de tarea inválido')
    tasks = []
    seen = set()
    for i, match in enumerate(matches):
        ident, title = match.groups()
        require(ident not in seen, f'ID de tarea duplicado: {ident}')
        seen.add(ident)
        require(re.match(r'\[(SETUP|IMPL|TEST|VERIFY)\] .+', title), f'{ident}: tipo inválido')
        # Only task fields before the next task or next level-2 section belong here.
        block = text[match.end():matches[i + 1].start() if i + 1 < len(matches) else len(text)]
        block = re.split(r'^## ', block, maxsplit=1, flags=re.M)[0]
        pairs = FIELD.findall(block)
        fields = dict(pairs)
        require(len(pairs) == len(fields), f'{ident}: campos duplicados')
        for key in ('Status', 'Depends on', 'Traceability', 'Files', 'Objective',
                    'Work', 'Done when', 'Verification', 'Command', 'Exit code', 'Evidence'):
            require(key in fields and fields[key], f'{ident}: falta **{key}:**')
        require(fields['Status'] in STATES, f'{ident}: Status inválido')
        require(fields['Verification'] in ('PASS', 'FAIL', 'NOT_RUN'),
                f'{ident}: Verification inválido')
        deps_value = fields['Depends on']
        deps = re.findall(r'T[1-9]\d*\.[1-9]\d*', deps_value)
        remainder = re.sub(r'T[1-9]\d*\.[1-9]\d*', '', deps_value)
        require(not remainder.strip(' ,`—-'), f'{ident}: dependencia inválida')
        require(len(deps) == len(set(deps)), f'{ident}: dependencia repetida')
        if fields['Status'] == 'COMPLETED':
            require(fields['Verification'] == 'PASS' and fields['Exit code'] == '0',
                    f'{ident}: COMPLETED requiere PASS y Exit code 0')
            require(concrete(fields['Command']) and concrete(fields['Evidence']),
                    f'{ident}: COMPLETED requiere comando y evidencia concretos')
        if fields['Status'] == 'BLOCKED':
            for key in ('Blocker', 'Source', 'Required action'):
                require(key in fields and concrete(fields[key]), f'{ident}: falta {key} del bloqueo')
        tasks.append(dict(id=ident, title=title, deps=deps, fields=fields))
    by_id = {t['id']: t for t in tasks}
    for index, task in enumerate(tasks):
        for dep in task['deps']:
            require(dep in by_id, f"{task['id']}: dependencia inexistente {dep}")
            require(dep in {t['id'] for t in tasks[:index]},
                    f"{task['id']}: dependencia fuera de orden o ciclo: {dep}")
            if task['fields']['Status'] in ('IN_PROGRESS', 'TESTING', 'COMPLETED'):
                require(by_id[dep]['fields']['Status'] == 'COMPLETED',
                        f"{task['id']}: dependencia {dep} sin completar")
    return tasks


def cell(value):
    return value.replace('|', '\\|').replace('\n', ' ')


def dashboard(tasks):
    counts = {s: sum(t['fields']['Status'] == s for t in tasks) for s in STATES}
    total = len(tasks)
    done = counts['COMPLETED']
    active = counts['IN_PROGRESS'] + counts['TESTING']
    status = ('COMPLETED' if done == total else 'BLOCKED' if counts['BLOCKED'] else
              'IN_PROGRESS' if done or active else 'READY')
    lines = [START, '## Task Progress', '', f'Status: {status}', '',
             '| Métrica | Cantidad |', '| --- | ---: |', f'| Total de tareas | {total} |',
             f'| Tareas realizadas | {done} |', f'| Tareas por realizar | {total - done} |',
             f"| Tareas bloqueadas | {counts['BLOCKED']} |", f'| Tareas en progreso | {active} |',
             f'| Progreso | {100 * done / total:.1f}% |', '',
             '## Registro de tareas', '', '| ID | Estado | Tarea | Evidencia actual |',
             '| --- | --- | --- | --- |']
    for t in tasks:
        lines.append(f"| {t['id']} | {t['fields']['Status']} | {cell(t['title'])} | "
                     f"{cell(t['fields']['Evidence'])} |")
    lines += ['', '## Checklist rápido', '']
    for t in tasks:
        lines.append(f"- [{SYMBOL[t['fields']['Status']]}] {t['id']} {t['title']}")
    lines += ['', END]
    return '\n'.join(lines)


def with_progress(text):
    require(text.startswith('# Tasks:'), 'tasks.md debe empezar con # Tasks: Nombre')
    require(text.count(START) == 1 and text.count(END) == 1,
            'Se requieren exactamente los dos marcadores sdd:progress')
    start, end = text.index(START), text.index(END)
    require(start < end, 'Marcadores de progreso invertidos')
    require(text[:start].strip() == text.splitlines()[0],
            'El tablero debe estar inmediatamente después del título')
    tasks = parse_tasks(text)
    return text[:start] + dashboard(tasks) + text[end + len(END):]


def approved(path):
    text = read(path)
    require(meta(text, 'Status') == 'APPROVED', f'{path}: requiere Status: APPROVED')
    require(re.fullmatch(r'[1-9]\d*', meta(text, 'Version')), f'{path}: Version debe ser entero positivo')
    return text


def plan_inputs(module):
    return {'Spec-SHA256': module / 'spec.md',
            'Constitution-SHA256': module.parent.parent / 'constitution.md'}


def check_plan(module):
    text = approved(module / 'plan.md')
    for key, path in plan_inputs(module).items():
        approved(path)
        require(meta(text, key) == sha(path), f'plan.md: entrada modificada {path.name}; revisar y bind plan')
    return text


def bind(module, artifact):
    target = module / f'{artifact}.md'
    text = read(target)
    if artifact == 'plan':
        approved(target)
        inputs = plan_inputs(module)
    else:
        check_plan(module)
        inputs = {'Spec-SHA256': module / 'spec.md', 'Plan-SHA256': module / 'plan.md'}
    for key, path in inputs.items():
        approved(path)
        text = set_meta(text, key, sha(path))
    target.write_text(text, encoding='utf-8')


def check_module(module):
    plan = check_plan(module)
    text = read(module / 'tasks.md')
    require(re.fullmatch(r'[1-9]\d*', meta(text, 'Version')), 'tasks.md: Version debe ser entero positivo')
    require(meta(text, 'Spec-SHA256') == sha(module / 'spec.md'), 'tasks.md: spec cambió; revisar y bind tasks')
    require(meta(text, 'Plan-SHA256') == sha(module / 'plan.md'), 'tasks.md: plan cambió; revisar y bind tasks')
    require(text == with_progress(text), 'Tablero desactualizado: ejecutar progress tasks.md')
    task_list = parse_tasks(text)
    spec = read(module / 'spec.md')
    known = set(re.findall(r'\b(?:PLAN-\d+|RF-\d+\.\d+|SC-\d+\.\d+\.\d+|RB-\d+)\b', plan + '\n' + spec))
    for task in task_list:
        refs = re.findall(r'\b(?:PLAN-\d+|RF-\d+\.\d+|SC-\d+\.\d+\.\d+|RB-\d+)\b',
                          task['fields']['Traceability'])
        require(refs, f"{task['id']}: trazabilidad sin IDs")
        require(set(refs) <= known, f"{task['id']}: referencias inexistentes {set(refs) - known}")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest='command', required=True)
    progress = sub.add_parser('progress', help='Generar o comprobar tablero inicial')
    progress.add_argument('path', type=Path)
    progress.add_argument('--check', action='store_true', help='Solo comprobar, sin escribir')
    check = sub.add_parser('check', help='Verificar módulo, tablero y entradas aprobadas')
    check.add_argument('path', type=Path)
    binding = sub.add_parser('bind', help='Vincular entradas DESPUÉS de revisión humana/agente')
    binding.add_argument('path', type=Path)
    binding.add_argument('--artifact', choices=('plan', 'tasks'), required=True)
    args = parser.parse_args(argv)
    try:
        if args.command == 'progress':
            original = read(args.path)
            updated = with_progress(original)
            if args.check:
                require(original == updated, 'Tablero desactualizado')
            elif original != updated:
                args.path.write_text(updated, encoding='utf-8')
        elif args.command == 'bind':
            bind(args.path, args.artifact)
        else:
            check_module(args.path)
        print(f'OK: {args.command} {args.path}')
        return 0
    except (Invalid, OSError) as exc:
        print(f'ERROR: {exc}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
