---
title: Introducción
order: 1
icon: Sparkles
description: Qué es PTI TeleInspect y cómo está organizado el sistema.
---

# Introducción

**PTI TeleInspect** es una plataforma para gestionar inspecciones técnicas de sitios de telecomunicaciones (torres, equipos, instalaciones eléctricas). El sistema se compone de dos aplicaciones que comparten la misma base de datos:

- **App móvil (Inspector App)** — PWA instalable en teléfono o tablet. Los inspectores la usan en campo para crear órdenes, capturar fotos y completar formularios.
- **Panel administrativo (Admin Panel)** — Web app accesible desde escritorio o tablet. Los supervisores y administradores la usan para revisar entregas, generar reportes, gestionar usuarios y auditar.

Este manual cubre el **Panel administrativo**.

## Arquitectura a alto nivel

```
┌─────────────────┐         ┌─────────────────┐
│  Inspector App  │         │   Admin Panel   │
│  (PWA móvil)    │         │  (web)          │
└────────┬────────┘         └────────┬────────┘
         │                           │
         └──────────┬────────────────┘
                    │
            ┌───────▼────────┐
            │   Supabase     │
            │  (PostgreSQL + │
            │   Auth + RLS)  │
            └────────────────┘
```

Toda la seguridad y filtrado de datos se hace en la base de datos vía **Row-Level Security (RLS)**. Esto significa que cuando un supervisor abre el panel, la base de datos misma decide qué filas puede ver según su rol y configuración, antes de que la información salga del servidor. El frontend nunca recibe datos que no debería ver.

## Conceptos clave que vas a encontrar

A lo largo del manual aparecen estos términos. Si te perdés, mirá el **Glosario** al final.

| Término | Significado breve |
|---|---|
| **Empresa** (`company`) | Cliente final o entidad operativa. Cada empresa tiene un `org_code` único. |
| **Región** (`region`) | Área geográfica que agrupa sitios. Una empresa puede operar en varias regiones. |
| **Sitio** (`site`) | Punto físico donde se hace una inspección. Pertenece a una región. |
| **Visita / Orden** (`site_visit`) | Una visita programada o ejecutada a un sitio. |
| **Entrega / Submission** | Un formulario completado dentro de una visita. Una visita puede tener varias entregas (mantenimiento, fotos, ascenso, etc). |
| **Rol** | Tipo de usuario: `admin`, `supervisor`, `inspector` o `viewer`. |
| **Scope** | Alcance de acceso del usuario: `global` o `scoped`. |

## Por dónde seguir

- Si recién empezás: leé **Control de acceso** primero. Es la base de todo lo demás.
- Si vas a crear usuarios: **Gestión de usuarios** te lleva paso a paso.
- Si algo no funciona: **Mantenimiento y troubleshooting** y los **Logs**.
- Si buscás un término puntual: usá el **buscador** arriba a la derecha — escribí lo que estás buscando y aparecen las secciones relevantes al instante.
