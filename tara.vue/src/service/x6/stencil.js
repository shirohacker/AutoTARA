import shapes from '@/service/x6/shapes/generics';
// import kubernetesShapes from './kubernetesShapes/index.js';
import { Stencil as DefaultStencil } from '@antv/x6';

const getStencilConfig = (target) => ({
    title: 'Entities',
    target: target,
    collapsable: true,
    stencilGraphWidth: 300,
    stencilGraphHeight: 0,
    groups: [
        {
            name: 'generics',
            title: 'Generic',
            collapsed: true,
            collapsable: true
        },
        {
            name: 'boundaries',
            title: 'Boundaries',
            collapsed: true,
            collapsable: true
        },
        {
            name: 'metadata',
            title: 'Metadata',
            collapsed: true,
            collapsable: true
        },
        {
            name: 'kubernetes',
            title: 'Kubernetes',
            collapsed: true,
            collapsable: true
        },
        {
            name: 'containerd',
            title: 'Containerd',
            collapsed: true,
            collapsable: true
        },
        {
            name: 'cloud',
            title: 'Cloud',
            collapsed: true,
            collapsable: true
        },
    ],
    layoutOptions: {
        columns: 1,
        center: true,
        resizeToFit: true,
    },
});

const get = (target, container, StencilClass = DefaultStencil) => {
    const stencil = new StencilClass(getStencilConfig(target));

    stencil.load(
        [
            new shapes.ProcessShape({data: { name: 'Process', description: '' }}),
            new shapes.StoreShape({data: { name: 'Store', description: '' }}),
            new shapes.ActorShape({data: { name: 'Actor', description: '' }}),
            new shapes.FlowStencil(),
        ],
        'generics'
    );

    stencil.load(
        [
            new shapes.TrustBoundaryBox({
                width: 160,
                height: 75,
            }),
            new shapes.TrustBoundaryCurveStencil(),
        ],
        'boundaries'
    );

    stencil.load([new shapes.TextBlock()], 'metadata');

    stencil.load(
        [
            new shapes.ProcessShape({
                label: 'Kubectl',
                data: { name: 'Kubectl' }
            }),
            new shapes.ProcessShape({
                label: 'Kube Proxy',
                data: { name: 'Kube Proxy' }
            }),
            new shapes.ProcessShape({
                label: 'Control Plane',
                data: { name: 'Control Plane' }
            }),
            new shapes.ProcessShape({
                label: 'Kubelet',
                data: { name: 'Kubelet' }
            }),
            new shapes.ProcessShape({
                label: 'Pod',
                data : { name: 'Pod' }
            }),
            new shapes.ProcessShape({
                label: 'HostPath Controller',
                data: { name: 'HostPath Controller' }
            }),
        ],
        'kubernetes'
    )

    stencil.load(
        [
            new shapes.ProcessShape({
                label: 'gRPC',
                data: { name: 'gRPC' }
            }),
            new shapes.ProcessShape({
                label: 'Metrics',
                data: { name: 'Metrics' }
            }),
            new shapes.ProcessShape({
                label: 'Services',
                data: { name: 'Services' }
            }),
            new shapes.ProcessShape({
                label: 'Metadata',
                data: { name: 'Metadata' }
            }),
            new shapes.ProcessShape({
                label: 'Snapshotter',
                data: { name: 'Snapshotter' }
            }),
            new shapes.ProcessShape({
                label: 'Containerd-shim',
                data: { name: 'Containerd-shim' }
            }),
            new shapes.ProcessShape({
                label: 'runc',
                data: { name: 'runc' }
            }),
            new shapes.StoreShape({
                label: 'BoltDB',
                data: { name: 'BoltDB' }
            }),
            new shapes.StoreShape({
                label: 'Content Store',
                data: { name: 'Content Store' }
            })
        ],
        'containerd'
    )

    stencil.load(
        [
            new shapes.StoreShape({
                label: 'Host File System',
                data: { name: 'Host File System' }
            }),
            new shapes.ActorShape({
                label: 'Prometheus',
                data: { name: 'Prometheus' }
            }),
            new shapes.StoreShape({
                label: 'Image Registry',
                data: { name: 'Image Registry' }
            })
        ],
        'cloud'
    )

    container.appendChild(stencil.container);
};

export default {
    get,
};

